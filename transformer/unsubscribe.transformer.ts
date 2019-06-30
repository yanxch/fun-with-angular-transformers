import * as ts from 'typescript';
import {AngularCompilerPlugin} from '@ngtools/webpack';


// Build with:
// Terminal 1: tsc --skipLibCheck --module umd -w
// Terminal 2: ng build --aot --plugin ~dist/out-tsc/plugins.js
// Terminal 3: ng build --plugin ~dist/out-tsc/plugins.js
// ng serve --plugin ~dist/out-tsc/plugins.js

const rxjsTypes = [
  'Observable',
  'BehaviorSubject',
  'Subject',
  'ReplaySubject',
  'AsyncSubject'
];

/**
 * 
 * ExpressionStatement
 *  -- CallExpression
 *     -- PropertyAccessExpression
 * 
 * 
 * looking into:
 *    - call expressions within a
 *    - expression statement only
 *    - that wraps another call expression where a property is called with subscribe 
 *    - and the type is contained in rxjsTypes
 * 
 */
function isSubscribeExpression(node: ts.Node, checker: ts.TypeChecker): node is ts.CallExpression {
  // ts.isBinaryExpression
  // ts.isCallExpression
  // ts.isClassDeclaration
  // ts.is

  return ts.isCallExpression(node) &&
    node.parent && ts.isExpressionStatement(node.parent) &&
    ts.isPropertyAccessExpression(node.expression) &&
    node.expression.name.text === 'subscribe' &&
    rxjsTypes.includes(getTypeAsString(node, checker));
} 

function getTypeAsString(node: ts.CallExpression, checker: ts.TypeChecker) {
  const type: ts.Type = checker.getTypeAtLocation((node.expression as ts.PropertyAccessExpression | ts.CallExpression).expression);
  console.log('TYPE: ', type.symbol.name);
  return type.symbol.name;
}

/**
 * Takes a subscibe call expression and wraps it with:
 * this.subscriptions.push(node)
 */
function wrapSubscribe(node: ts.CallExpression, visit, context) {
  return ts.createCall(
    ts.createPropertyAccess(
      ts.createPropertyAccess(ts.createThis(), 'subscriptions'),
      'push'
    ),
    undefined,
    [ts.visitEachChild(node, visit, context)]
  );
}

function logComponentFound(node: ts.ClassDeclaration) {
  console.log('Found component: ', node.name.escapedText);
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

      let withinComponent = false;
      let containsSubscribe = false;

      function visit(node: ts.Node): ts.Node {

        // 1.
        if (ts.isClassDeclaration(node) && isComponent(node)) {
          console.log('-------S------');
          logComponentFound(node);
          console.log(acp.getDependencies(rootNode.fileName));
          console.log('-------E-----');

          withinComponent = true;
        
          // 2. Visit the child nodes of the class to find all subscriptions first
          const newNode = ts.visitEachChild(node, visit, context);

          if (containsSubscribe) {
            // 4. Create the subscriptions array
            newNode.members = ts.createNodeArray([...newNode.members, createSubscriptionsArray()]);
  
            // 5. Create the ngOnDestroyMethod if not there 
            if (!hasNgOnDestroyMethod(node)) {
              newNode.members = ts.createNodeArray([...newNode.members, createNgOnDestroyMethod()]);
            }
 
            // 6. Create the unsubscribe loop in the body of the ngOnDestroyMethod
            const ngOnDestroyMethod = getNgOnDestroyMethod(newNode);
            ngOnDestroyMethod.body.statements = ts.createNodeArray([...ngOnDestroyMethod.body.statements, createUnsubscribeStatement()]);
          }

          withinComponent = false;
          containsSubscribe = false;

          return newNode;
        } 

        // 3.
        if (isSubscribeExpression(node, checker) && withinComponent) {
          containsSubscribe = true;
          return wrapSubscribe(node, visit, context);
        }
      
        return ts.visitEachChild(node, visit, context);
      }

      return ts.visitNode(rootNode, visit);
    };
  };
}
