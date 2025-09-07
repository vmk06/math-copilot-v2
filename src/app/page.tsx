// File: src/app/page.tsx
"use client"; 

import { useState, FormEvent } from 'react';
import 'katex/dist/katex.min.css';

import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

// Helper to parse the structured response from the AI
const parseAIResponse = (responseText: string) => {
  const hints = [];
  const hint1 = responseText.match(/<HINT_1>([\s\S]*?)<\/HINT_1>/);
  const hint2 = responseText.match(/<HINT_2>([\s\S]*?)<\/HINT_2>/);
  const hint3 = responseText.match(/<HINT_3>([\s\S]*?)<\/HINT_3>/);
  const solution = responseText.match(/<FULL_SOLUTION>([\s\S]*?)<\/FULL_SOLUTION>/);

  if (hint1) hints.push(hint1[1].trim());
  if (hint2) hints.push(hint2[1].trim());
  if (hint3) hints.push(hint3[1].trim());

  return {
    hints,
    solution: solution ? solution[1].trim() : "Sorry, I couldn't generate a full solution.",
  };
};

export default function HomePage() {
  const [problem, setProblem] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const [hints, setHints] = useState<string[]>([]);
  const [solution, setSolution] = useState('');
  const [currentHintIndex, setCurrentHintIndex] = useState(-1);
  const [showSolution, setShowSolution] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setHints([]);
    setSolution('');
    setCurrentHintIndex(-1);
    setShowSolution(false);

    const response = await fetch('/api/solve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ problem: problem }),
    });

    const data = await response.json();
    const parsedData = parseAIResponse(data.solution);
    
    setHints(parsedData.hints);
    setSolution(parsedData.solution);
    setCurrentHintIndex(0);
    setIsLoading(false);
  };

  const handleNextHint = () => {
    if (currentHintIndex < hints.length - 1) {
      setCurrentHintIndex(currentHintIndex + 1);
    }
  };

  const handleShowSolution = () => {
    setShowSolution(true);
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-12 bg-gray-900 text-white">
      <h1 className="text-4xl font-bold mb-8">Math Olympiad Co-Pilot</h1>
      
      <form onSubmit={handleSubmit} className="w-full max-w-2xl">
        <label htmlFor="problemInput" className="block text-lg font-medium mb-2">
          Enter your math problem:
        </label>
        <textarea
          id="problemInput"
          value={problem} 
          onChange={(e) => setProblem(e.target.value)}
          className="w-full h-40 p-4 bg-gray-800 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          placeholder="e.g., 'Prove that for any prime p > 3, p^2 ≡ 1 (mod 24).'"
        ></textarea>
        
        <button 
          type="submit"
          className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition duration-200 disabled:bg-gray-500"
          disabled={isLoading || !problem}
        >
          {isLoading ? 'Thinking...' : 'Begin Tutoring'}
        </button>
      </form>

      {/* Display Hints */}
      {currentHintIndex >= 0 && !showSolution && (
        <div className="w-full max-w-2xl mt-8">
          {hints.slice(0, currentHintIndex + 1).map((hint, index) => (
            <div key={index} className="prose prose-invert max-w-none bg-gray-800 rounded-lg p-6 mb-4">
              <h2 className="text-2xl font-bold mb-4">Hint {index + 1}:</h2>
              <div className="not-prose">
                <ReactMarkdown 
                  remarkPlugins={[remarkMath]} 
                  rehypePlugins={[rehypeKatex]}
                >
                  {hint}
                </ReactMarkdown>
              </div>
            </div>
          ))}

          {/* Logic for the next hint / show solution buttons */}
          {currentHintIndex < hints.length - 1 ? (
            <button onClick={handleNextHint} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg">
              Show Next Hint
            </button>
          ) : (
            <button onClick={handleShowSolution} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-lg">
              Show Full Solution
            </button>
          )}
        </div>
      )}

      {/* Display Full Solution */}
      {showSolution && (
        <div className="w-full max-w-2xl mt-8 prose prose-invert max-w-none bg-gray-800 rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-4">Full Solution:</h2>
          <div className="not-prose">
            <ReactMarkdown 
              remarkPlugins={[remarkMath]} 
              rehypePlugins={[rehypeKatex]}
            >
              {solution}
            </ReactMarkdown>
          </div>
        </div>
      )}
    </main>
  );
}