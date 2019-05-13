import * as ts from 'typescript';
import {AngularCompilerPlugin} from '@ngtools/webpack';

// Build with:
// Terminal 1: tsc --skipLibCheck --module umd -w
// Terminal 2: ng build --aot --plugin ~dist/out-tsc/plugins.js

const rxjsTypes = [
  'Observable',
  'BehaviorSubject',
  'Subject',
  'ReplaySubject'
];
/**
 * looking into:
 *    - call expressions within a
 *    - expression statement only
 *    - that wraps another call expression where a property is called with subscribe 
 *    - and the type is contained in rxjsTypes
 * 
 * Attention: If there is another method call to "subscribe" anywhere, that is not coming from RxJs, we are screwed!
 */
function isSubscribeExpression(node: ts.Node, checker: ts.TypeChecker): node is ts.CallExpression {
  return ts.isCallExpression(node)  
    && node.parent && ts.isExpressionStatement(node.parent) 
    && ts.isPropertyAccessExpression(node.expression)
    && node.expression.name.text === 'subscribe'
    && rxjsTypes.includes(getTypeAsString(node, checker));
} 

function getTypeAsString(node: ts.CallExpression, checker: ts.TypeChecker) {
  const type = checker.getTypeAtLocation((node.expression as ts.PropertyAccessExpression | ts.CallExpression).expression);
  console.log('TYPE: ', type.symbol.name);
  return type.symbol.name;
}

/**
 * Takes a subscibe call expression and wraps it with:
 * this.subscriptions.push(node)
 */
function wrapSubscribe(node: ts.CallExpression) {
  
  // console.log(node.expression);

  return ts.createCall(
    ts.createPropertyAccess(
      ts.createPropertyAccess(ts.createThis(), 'subscriptions'),
      'push'
    ),
    undefined,
    [node]
  );
}

function logClassFound(node: ts.ClassDeclaration) {
  console.log('Found class: ', node.name.escapedText);
}

function isComponent(node: ts.ClassDeclaration) {
  return node.decorators && node.decorators.filter(d => d.getFullText().trim().startsWith('@Component')).length > 0;
}

/**
 * creates an empty array property:
 * subscriptions = [];
 */
function createSubscriptionsArray() {
  return ts.createProperty(
    undefined, 
    undefined, 
    'subscriptions', 
    undefined, 
    undefined, 
    ts.createArrayLiteral()
  );
}

function isNgOnDestroyMethod(node: ts.ClassElement): node is ts.MethodDeclaration {
  return ts.isMethodDeclaration(node) && (node.name as ts.Identifier).text == 'ngOnDestroy';
}

function hasNgOnDestroyMethod(node: ts.ClassDeclaration) {
  return node.members.filter(node => isNgOnDestroyMethod(node)).length > 0;
}

function getNgOnDestroyMethod(node: ts.ClassDeclaration) {
  const n = node.members
    .filter(node => isNgOnDestroyMethod(node))
    .map(node => node as ts.MethodDeclaration);
   return n[0];
}

function createNgOnDestroyMethod() {
  return ts.createMethod(
    undefined,
    undefined,
    undefined,
    'ngOnDestroy',
    undefined,
    [],
    [],
    undefined,
    ts.createBlock([], true)
  );
}

function createUnsubscribeStatement() {
  return ts.createExpressionStatement(
    ts.createCall(
      ts.createPropertyAccess(
        ts.createPropertyAccess(ts.createThis(), 'subscriptions'),
        'forEach'
      ),
      undefined,
      [
        ts.createArrowFunction(
          undefined,
          undefined,
          [
            ts.createParameter(undefined, undefined, undefined, 'sub', undefined, undefined, undefined)
          ],
          undefined,
          ts.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
          ts.createCall(
            ts.createPropertyAccess(ts.createIdentifier('sub'), 'unsubscribe'),
            undefined,
            []
          )
        )
      ]
    )
  );
}

export function unsubscribeTransformerFactory(acp: AngularCompilerPlugin) {
  return (context: ts.TransformationContext) => {

    const checker = acp.typeChecker;

    return (rootNode: ts.SourceFile) => {
   
      function visit(node: ts.Node): ts.Node {
  
        if (isSubscribeExpression(node, checker)) {
          return wrapSubscribe(node);
        }
        
        if (ts.isClassDeclaration(node)) {
          logClassFound(node);
  
          if (isComponent(node)) {
            // 1.
            node.members = ts.createNodeArray([...node.members, createSubscriptionsArray()]);
  
            // 2.
            if (!hasNgOnDestroyMethod(node)) {
              node.members = ts.createNodeArray([...node.members, createNgOnDestroyMethod()]);
            }
  
            // 3.
            const ngOnDestroyMethod = getNgOnDestroyMethod(node);
            ngOnDestroyMethod.body.statements = ts.createNodeArray([...ngOnDestroyMethod.body.statements, createUnsubscribeStatement()]);
          }  
        } 
        
        return ts.visitEachChild(node, visit, context);
      }
  
      return ts.visitNode(rootNode, visit);
    };
  };
}
