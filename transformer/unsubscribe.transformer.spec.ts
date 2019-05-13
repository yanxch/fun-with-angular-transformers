import * as ts from 'typescript';

import {MockAotContext, MockCompilerHost} from './mocks';
import {unsubscribeTransformerFactory} from './unsubscribe.transformer';

describe('unsubscribe transformer', () => {
  it('should create ngOnDestroy method and subscriptions field', () => {
    const enhanced = convert(`
      @Component({
        selector: 'test-selector'
      }) 
      class Foo {

      }
    `);
    expect(enhanced).toMatchSnapshot();
  });

  it('should keep existing ngOnDestroy method', () => {
    const enhanced = convert(`
      @Component({
        selector: 'test-selector'
      }) 
      class Foo {
        ngOnDestroy() {
          console.log('Keep me there plz!');
        }
      }
    `);
    expect(enhanced).toMatchSnapshot();
  });
});

function convert(source: string) {
  
  const baseFileName = 'someFile';
  const moduleName = '/' + baseFileName;
  const fileName = moduleName + '.ts';
  const context = new MockAotContext('/', {[baseFileName + '.ts']: source});
  const host = new MockCompilerHost(context);

  const sourceFile =
      ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, /* setParentNodes */ true);
  const program = ts.createProgram(
      [fileName], {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2017,
      },
      host);
  const moduleSourceFile = program.getSourceFile(fileName);
  const typeChecker = program.getTypeChecker();

  const transformers: ts.CustomTransformers = {
    before: [unsubscribeTransformerFactory({ typeChecker } as any)]
  };
  let result = '';
  const emitResult = program.emit(
      moduleSourceFile, (emittedFileName, data, writeByteOrderMark, onError, sourceFiles) => {
        if (fileName.startsWith(moduleName)) {
          result = data;
        }
      }, undefined, undefined, transformers);
  return result;
  
}
