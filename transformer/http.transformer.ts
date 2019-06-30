import * as ts from 'typescript';
import {AngularCompilerPlugin} from '@ngtools/webpack';
import axios, { AxiosRequestConfig, AxiosPromise } from 'axios';

// Build with:
// Terminal 1: tsc --skipLibCheck --module umd -w
// Terminal 2: ng build --aot --plugin ~dist/out-tsc/plugins.js
// Terminal 3: ng build --plugin ~dist/out-tsc/plugins.js
// ng serve --plugin ~dist/out-tsc/plugins.js


// 1. CallExpression
// 2. CallExpression.expression === PropertyAccessExpression
// 3. PropertyAccessExpression.expression === PropertyAccessExpression
// 4. PropertyAccessExpression.name === 'http'

// Get the HTTP Method from the name of the first PropertyAccessExpression
// Get the Arguments of the CallExpression (Array mit Stringliteral == URL)
// Create Observable with Observable.of({}) an replace the CallExpression with it


function isHttpExpression(node: ts.Node): node is ts.CallExpression {
  return ts.isCallExpression(node) &&
    ts.isPropertyAccessExpression(node.expression) &&
    ts.isPropertyAccessExpression(node.expression.expression) &&
    node.expression.expression.name.text === 'http';
}

export function httpTransformerFactory(acp: AngularCompilerPlugin) {
  return (context: ts.TransformationContext) => {

    return (rootNode: ts.SourceFile) => {
      console.log('visit: ' + rootNode.fileName);

      function visit(node: ts.Node): ts.Node {

        if (isHttpExpression(node)) {
          const httpMethodExpression = (node.expression as ts.PropertyAccessExpression);
          const httpExpression = (httpMethodExpression.expression as ts.PropertyAccessExpression);
          const httpUrl = node.arguments[0] as ts.StringLiteral;
          console.log('1. PropertyAccessExpression - Name: ' +  httpMethodExpression.name.text);
          console.log('2. PropertyAccessExpression - Name: ' +  httpExpression.name.text);
          console.log('3. URL: ' +  httpUrl.text);

          console.log('Found a http call');

          axios
            .get(httpUrl.text)
            .then(function (response) {
              // handle success
              const dataString = JSON.stringify(response.data);

              const callExpression = ts.createCall(
                ts.createIdentifier('of'),
                undefined,
                [ts.createStringLiteral(dataString)]
              );

              console.log(callExpression);
            });
        }

        return ts.visitEachChild(node, visit, context);
      }

      return ts.visitNode(rootNode, visit);
    };
  };
}


/*function isSubscribeExpression(node: ts.Node, checker: ts.TypeChecker): node is ts.CallExpression {
  // ts.isBinaryExpression
  // ts.isCallExpression
  // ts.isClassDeclaration
  // ts.is

  return ts.isCallExpression(node) &&
    node.parent && ts.isExpressionStatement(node.parent) &&
    ts.isPropertyAccessExpression(node.expression) &&
    node.expression.name.text === 'subscribe' &&
    rxjsTypes.includes(getTypeAsString(node, checker));
} */