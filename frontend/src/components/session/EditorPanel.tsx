'use client';

import { useEffect, useState } from 'react';
import Editor from '@monaco-editor/react';
import { Socket } from 'socket.io-client';
import { Code2, Settings, Play, CheckCircle, ChevronDown, User } from 'lucide-react';
import { useRef } from 'react';

const SUPPORTED_LANGUAGES = [
  { id: 'python', name: 'Python', compiler: 'cpython-3.12.7', defaultCode: 'def main():\n    print("Hello from Python!")\n\nif __name__ == "__main__":\n    main()' },
  { id: 'java', name: 'Java', compiler: 'openjdk-jdk-22+36', defaultCode: 'class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello from Java!");\n    }\n}' },
  { id: 'c', name: 'C', compiler: 'gcc-13.2.0-c', defaultCode: '#include <stdio.h>\n\nint main() {\n    printf("Hello from C!\\n");\n    return 0;\n}' }
];

export const EditorPanel = ({ socket, initialLanguage = 'python' }: { socket: Socket | null, initialLanguage?: string }) => {
  const [language, setLanguage] = useState(SUPPORTED_LANGUAGES.find(l => l.id === initialLanguage) ? initialLanguage : 'python');
  const [value, setValue] = useState(SUPPORTED_LANGUAGES.find(l => l.id === language)?.defaultCode || '');
  const [version, setVersion] = useState(0);
  const [isExecuting, setIsExecuting] = useState(false);
  const [output, setOutput] = useState<{ stdout: string; stderr: string; code: number } | null>(null);
  const editorRef = useRef<any>(null);
  const [remoteCursors, setRemoteCursors] = useState<Record<string, { line: number, column: number, name: string }>>({});
  const decorationsRef = useRef<Record<string, string[]>>({});

  useEffect(() => {
    if (!socket) return;

    socket.on('editor-sync', (data: { content: string; version: number, language?: string }) => {
      // Don't wipe the editor with an empty string if it's a fresh session (version 0)
      if (data.version > 0 || data.content) {
        setValue(data.content);
        setVersion(data.version);
      }
      if (data.language && SUPPORTED_LANGUAGES.find(l => l.id === data.language)) {
        setLanguage(data.language);
      }
    });

    socket.on('editor-change', (data: { content: string; version: number }) => {
      setValue(data.content);
      setVersion(data.version);
    });

    socket.on('language-change', (newLanguage: string) => {
      if (SUPPORTED_LANGUAGES.find(l => l.id === newLanguage)) {
        setLanguage(newLanguage);
      }
    });

    socket.on('editor-output', (data: any) => {
      setOutput(data);
    });

    socket.on('cursor-move', (data: { userId: string, line: number, column: number, name: string }) => {
      setRemoteCursors(prev => ({
        ...prev,
        [data.userId]: { line: data.line, column: data.column, name: data.name }
      }));
    });

    return () => {
      socket.off('editor-sync');
      socket.off('editor-change');
      socket.off('language-change');
      socket.off('editor-output');
      socket.off('cursor-move');
    };
  }, [socket]);

  useEffect(() => {
    if (!editorRef.current) return;

    Object.entries(remoteCursors).forEach(([userId, pos]) => {
      const newDecorations = [
        {
          range: { startLineNumber: pos.line, startColumn: pos.column, endLineNumber: pos.line, endColumn: pos.column + 1 },
          options: {
            className: `remote-cursor-${userId}`,
            beforeContentClassName: `remote-cursor-label-${userId}`,
            hoverMessage: { value: pos.name }
          }
        }
      ];

      decorationsRef.current[userId] = editorRef.current.deltaDecorations(
        decorationsRef.current[userId] || [],
        newDecorations
      );

      // Injecting dynamic styles for this cursor
      if (!document.getElementById(`cursor-style-${userId}`)) {
        const style = document.createElement('style');
        style.id = `cursor-style-${userId}`;
        const color = `hsl(${Math.random() * 360}, 70%, 50%)`;
        style.innerHTML = `
          .remote-cursor-${userId} {
            border-left: 2px solid ${color};
            margin-left: -1px;
          }
          .remote-cursor-label-${userId}::after {
            content: "${pos.name}";
            position: absolute;
            top: -15px;
            left: 0;
            background: ${color};
            color: white;
            font-size: 8px;
            padding: 1px 4px;
            border-radius: 2px;
            white-space: nowrap;
            z-index: 10;
            opacity: 0.7;
          }
        `;
        document.head.appendChild(style);
      }
    });
  }, [remoteCursors]);

  const handleEditorChange = (newValue: string | undefined) => {
    if (newValue === undefined || !socket) return;
    
    const newVersion = version + 1;
    setValue(newValue);
    setVersion(newVersion);
    
    socket.emit('editor-change', { 
      content: newValue, 
      version: newVersion 
    });
  };

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLang = e.target.value;
    setLanguage(newLang);
    const defaultCode = SUPPORTED_LANGUAGES.find(l => l.id === newLang)?.defaultCode || '';
    
    // Automatically set default code for the new language
    const newVersion = version + 1;
    setValue(defaultCode);
    setVersion(newVersion);
    
    if (socket) {
      socket.emit('language-change', newLang);
      socket.emit('editor-change', { content: defaultCode, version: newVersion });
    }
    setOutput(null);
  };

  const runCode = async () => {
    if (!value.trim()) return;
    setIsExecuting(true);
    try {
      const selectedLang = SUPPORTED_LANGUAGES.find(l => l.id === language);
      if (!selectedLang) throw new Error("Unsupported language selected.");

      const res = await fetch('https://wandbox.org/api/compile.json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          compiler: selectedLang.compiler,
          code: value,
          save: false
        }),
      });
      
      const result = await res.json();
      
      const outputData = {
        stdout: result.program_message || result.program_output || '',
        stderr: result.compiler_error || result.compiler_message || result.program_error || '',
        code: parseInt(result.status || '0', 10)
      };
      
      setOutput(outputData);
      
      if (socket) {
        socket.emit('editor-output', outputData);
      }
    } catch (error: any) {
      setOutput({ stdout: '', stderr: 'Execution Failed: ' + error.message + '\n(Check network connection or Wandbox API status)', code: 1 });
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="flex flex-col h-full glass rounded-2xl overflow-hidden border border-white/10">
      <div className="flex items-center justify-between px-4 py-3 bg-white/5 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <Code2 className="w-4 h-4 text-primary" />
          </div>
          
          {/* Language Switcher */}
          <div className="relative">
            <select 
              value={language}
              onChange={handleLanguageChange}
              className="appearance-none bg-black/20 border border-white/10 text-white text-sm font-bold uppercase tracking-widest pl-3 pr-8 py-1.5 rounded-lg outline-none cursor-pointer hover:bg-black/40 transition-all focus:border-primary/50"
            >
              {SUPPORTED_LANGUAGES.map(lang => (
                <option key={lang.id} value={lang.id} className="bg-background text-white">
                  {lang.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50 pointer-events-none" />
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-2 py-1 bg-green-500/10 rounded-md border border-green-500/20 text-[10px] text-green-400 font-bold hidden sm:flex">
            <CheckCircle className="w-3 h-3" /> LIVE SYNC
          </div>
          <button 
            onClick={runCode}
            disabled={isExecuting}
            className="flex items-center gap-2 px-4 py-1.5 bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg text-xs font-bold hover:bg-green-500/30 transition-all disabled:opacity-50"
          >
            {isExecuting ? (
              <span className="w-3 h-3 border-2 border-green-400 border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <Play className="w-3 h-3 fill-current" /> 
            )}
            {isExecuting ? 'RUNNING...' : 'RUN'}
          </button>
        </div>
      </div>
      
      <div className="flex flex-col flex-1 min-h-0 bg-background">
        <div className={output ? "h-2/3 border-b border-white/10" : "h-full"}>
          <Editor
            height="100%"
            language={language}
            theme="vs-dark"
            value={value}
            onMount={(editor) => {
              editorRef.current = editor;
              editor.onDidChangeCursorPosition((e: any) => {
                if (socket) {
                  socket.emit('cursor-move', {
                    line: e.position.lineNumber,
                    column: e.position.column
                  });
                }
              });
            }}
            onChange={handleEditorChange}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              cursorStyle: 'block',
              wordWrap: 'on',
              scrollbar: { vertical: 'hidden', horizontal: 'hidden' },
              padding: { top: 20 },
              overviewRulerBorder: false,
              hideCursorInOverviewRuler: true,
              renderLineHighlight: 'all',
              lineNumbers: 'on',
              glyphMargin: false,
              folding: true,
              lineDecorationsWidth: 10,
              lineNumbersMinChars: 3,
            }}
          />
        </div>
        
        {/* Output Console */}
        {output && (
          <div className="h-1/3 flex flex-col bg-black/50">
            <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/10 shrink-0">
              <span className="text-xs font-bold text-white/50 uppercase tracking-widest">Terminal Output</span>
              <button onClick={() => setOutput(null)} className="text-xs text-white/30 hover:text-white transition-colors">Clear</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 font-mono text-sm">
              {output.stderr && <div className="text-red-400 whitespace-pre-wrap mb-2">{output.stderr}</div>}
              {output.stdout && <div className="text-green-400/90 whitespace-pre-wrap">{output.stdout}</div>}
              {output.code !== 0 && !output.stderr && <div className="text-red-400">Process exited with code {output.code}</div>}
              {output.code === 0 && !output.stdout && !output.stderr && <div className="text-white/30 italic">Process executed successfully with no output.</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
