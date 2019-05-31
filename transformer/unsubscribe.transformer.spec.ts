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

  it('should find nested subscriptions', () => {
    const enhanced = convert(`
      @Component({
        selector: 'test-selector'
      }) 
      class Foo {

        constructor(private heroService: HeroService) {
          this.heroService.mySubject.subscribe(v => {
            interval(1000).subscribe(val => console.log(val));
          });
        }

        ngOnDestroy() {
         
        }
      }
    `);
    expect(enhanced).toMatchSnapshot();
  });

  it('should not wrap subscriptions in a service', () => {
    const enhanced = convert(`
      @Injectable({
        providedIn: 'root'
      })
      export class HeroService {
      
        count = 1;
      
        mySubject = new BehaviorSubject(this.count);
      
        constructor() {
      
          this.mySubject.subscribe(v => console.log(v));
      
        }
      
        increase() {
          this.mySubject.next(this.count + 1);
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

  // Workaround: TypeChecker does not work in test
  typeChecker.getTypeAtLocation = function(node) { 
    return {
      symbol: {
        name: 'Observable'
      }
    } as any;
  }

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
