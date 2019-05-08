import * as ts from 'typescript';

// tsc --skipLibCheck --module umd -w
// ng build --aot --plugin ~dist/out-tsc/plugins.js


export const logTransformer = <T extends ts.Node>(context: ts.TransformationContext) => {
  return (rootNode: ts.SourceFile) => {
    console.log('Transforming file 1: ' + rootNode.fileName);
 
    function visit(node: ts.Node): ts.Node {


      if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
        // console.log('START: ' + node.expression.name.getStart());
        // console.log('WIDTH: ' + node.expression.name.getWidth());
        // console.log('TEXT: ' + node.expression.name.text);
        if(node.expression.name.text === 'subscribe') {
          console.log('FOUND SUBSCRIPTION!!!! ' + node.expression.name.getText());
          
          /*return ts.createCall(
            ts.createPropertyAccess(
              ts.createPropertyAccess(ts.createThis(), 'subscriptions'),
              'push'
            ),
            undefined,
            [node]
          );*/
          return node;

        }
        
      }

      
      if (ts.isClassDeclaration(node)) {
        
        console.log('Found class: ');
        console.log('Name: ', node.name.escapedText);
        if (node.decorators) {
          console.log('FOUND DECORATOR: ' + node.decorators[0].getFullText().trim());
          if (node.decorators[0].getFullText().trim().startsWith('@Component')) {
            console.log('Found COMPONENT');

            
            //
            // this.subscriptions = [];
            const propertyDeclaration = ts.createProperty(
              undefined, 
              undefined, 
              'subscriptions', 
              undefined, 
              undefined, 
              ts.createArrayLiteral()
            );
            node.members = [...node.members] as any;

            
            //
            // this.subscriptions.forEach(function (sub) { return sub.unsubscribe(); });
            node.members.map(member => {
              if (ts.isMethodDeclaration(member) && member.name.getText() === 'ngOnDestroy') {
                console.log('FOUND METHOD ' + member.name.getText());

                member.body.statements = [
                  ...member.body.statements,
                  ts.createExpressionStatement(
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
                  )
                ] as any;

                // wenn ngOnDestroy nicht vorhanden ist
                //
                //member.body = ts.createBlock([
                //
                //], true);

              }
            }); 

            
          }
        }

        
       } 
       


      return ts.visitEachChild(node, visit, context);
    }


    return ts.visitNode(rootNode, visit);
  };
};

function printTypescript(text: string) {
  let sourceFile = ts.createSourceFile(
    'afilename.ts', text,
    ts.ScriptTarget.ES2015,
    false,
  );
  console.log(JSON.stringify(sourceFile.statements, null, '\t'));
}