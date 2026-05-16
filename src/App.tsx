/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, XCircle, Info, RefreshCcw, ArrowRight } from 'lucide-react';

// --- Types & Data ---

type Sex = 'M' | 'F';

interface PedigreeNode {
  id: string;
  sex: Sex;
  affected: boolean;
  phenotypeLabel?: string; // For ABO blood type
  parents?: [string, string];
  generation: number;
  position: number; // 0, 1, 2... in that generation row
  correctAnswers: string[];
}

interface Scenario {
  id: string;
  level: number;
  title: string;
  description: string;
  nodes: PedigreeNode[];
  hint: string;
}

const SCENARIOS: Scenario[] = [
  {
    id: 'level1',
    level: 1,
    title: 'Level 1: 상염색체 열성 유전 (미맹)',
    description: '부모는 모두 정상인데, 자녀 중 미맹(aa)인 아들이 태어났습니다. 가족 구성원의 유전자형을 찾아보세요.',
    hint: '정상은 A, 미맹은 a로 표시합니다. 자녀가 aa라면 부모는 반드시 a를 하나씩 가지고 있어야 합니다.',
    nodes: [
      { id: '1', sex: 'M', affected: false, generation: 0, position: 0, correctAnswers: ['Aa', 'aA'] },
      { id: '2', sex: 'F', affected: false, generation: 0, position: 1, correctAnswers: ['Aa', 'aA'] },
      { id: '3', sex: 'M', affected: true, generation: 1, position: 0, correctAnswers: ['aa'], parents: ['1', '2'] },
      { id: '4', sex: 'F', affected: false, generation: 1, position: 1, correctAnswers: ['AA', 'Aa', 'aA'], parents: ['1', '2'] },
    ]
  },
  {
    id: 'level2',
    level: 2,
    title: 'Level 2: 상염색체 우성 유전 (보조개)',
    description: '부모는 모두 보조개가 있는데(우성), 자녀 중 한 명은 보조개가 없습니다. 가족 구성원의 유전자형을 찾아보세요.',
    hint: '보조개가 있는 경우 A, 없는 경우 a로 표시합니다. 보조개가 없는 자녀(aa)가 나오려면 부모는 모두 잡종(Aa)이어야 합니다.',
    nodes: [
      { id: '1', sex: 'M', affected: true, generation: 0, position: 0, correctAnswers: ['Aa', 'aA'] },
      { id: '2', sex: 'F', affected: true, generation: 0, position: 1, correctAnswers: ['Aa', 'aA'] },
      { id: '3', sex: 'M', affected: false, generation: 1, position: 0, correctAnswers: ['aa'], parents: ['1', '2'] },
      { id: '4', sex: 'F', affected: true, generation: 1, position: 1, correctAnswers: ['AA', 'Aa', 'aA'], parents: ['1', '2'] },
    ]
  },
  {
    id: 'level3',
    level: 3,
    title: 'Level 3: 반성 열성 유전 (적록 색맹)',
    description: '아버지는 정상, 어머니는 정상(보인자)입니다. 아들 중 한 명은 색맹이고 딸은 모두 정상입니다.',
    hint: "성염색체 유전이므로 남자는 XY, 여자는 XX를 기본으로 합니다. 색맹 유전자는 X'로 표시해 보세요. (예: X'Y, XX')",
    nodes: [
      { id: '1', sex: 'M', affected: false, generation: 0, position: 0, correctAnswers: ['XY'] },
      { id: '2', sex: 'F', affected: false, generation: 0, position: 1, correctAnswers: ['XX\'', 'X\'X'] },
      { id: '3', sex: 'M', affected: true, generation: 1, position: 0, correctAnswers: ['X\'Y'], parents: ['1', '2'] },
      { id: '4', sex: 'F', affected: false, generation: 1, position: 1, correctAnswers: ['XX', 'XX\'', 'X\'X'], parents: ['1', '2'] },
    ]
  },
  {
    id: 'level4',
    level: 4,
    title: 'Level 4: ABO식 혈액형 유전',
    description: '아버지는 A형, 어머니는 B형인데 자녀들에게서 A, B, AB, O형이 모두 태어났습니다. 부모의 유전자형은 무엇일까요?',
    hint: 'O형 자녀(OO)가 태어나려면 부모가 각각 O 유전자를 하나씩 가지고 있어야 합니다.',
    nodes: [
      { id: '1', sex: 'M', affected: false, phenotypeLabel: 'A', generation: 0, position: 0, correctAnswers: ['AO', 'OA'] },
      { id: '2', sex: 'F', affected: false, phenotypeLabel: 'B', generation: 0, position: 1, correctAnswers: ['BO', 'OB'] },
      { id: '3', sex: 'M', affected: false, phenotypeLabel: 'AB', generation: 1, position: 0, correctAnswers: ['AB', 'BA'], parents: ['1', '2'] },
      { id: '4', sex: 'F', affected: false, phenotypeLabel: 'O', generation: 1, position: 1, correctAnswers: ['OO'], parents: ['1', '2'] },
      { id: '5', sex: 'M', affected: false, phenotypeLabel: 'A', generation: 1, position: 2, correctAnswers: ['AO', 'OA'], parents: ['1', '2'] },
      { id: '6', sex: 'F', affected: false, phenotypeLabel: 'B', generation: 1, position: 3, correctAnswers: ['BO', 'OB'], parents: ['1', '2'] },
    ]
  }
];

// --- Helper Functions ---

const normalizeGenotype = (input: string) => {
  return input.trim().replace(/ /g, '').toLowerCase();
};

const checkAnswer = (input: string, correctAnswers: string[]) => {
  const normInput = normalizeGenotype(input);
  
  // For each correct answer, we check if it matches the normalized input
  // We also handle cases like AO/OA by sorting alphabet if it's blood type? 
  // No, the data already includes permutations in correctAnswers list for simplicity.
  // But let's be more robust:
  return correctAnswers.some(ans => {
    const normAns = normalizeGenotype(ans);
    // If it's blood type (contains A, B, O), we could sort, 
    // but the provided scenarios already have AO/OA etc.
    return normInput === normAns;
  });
};

// --- Components ---

export default function App() {
  const [currentScenarioIndex, setCurrentScenarioIndex] = useState(0);
  const [inputs, setInputs] = useState<{ [key: string]: string }>({});
  const [results, setResults] = useState<{ [key: string]: boolean }>({});
  const [isGraded, setIsGraded] = useState(false);
  const [message, setMessage] = useState('');

  const scenario = SCENARIOS[currentScenarioIndex];

  // Reset state when scenario changes
  useEffect(() => {
    setInputs({});
    setResults({});
    setIsGraded(false);
    setMessage('');
  }, [currentScenarioIndex]);

  const handleInputChange = (id: string, value: string) => {
    setInputs(prev => ({ ...prev, [id]: value }));
  };

  const handleGrade = () => {
    const newResults: { [key: string]: boolean } = {};
    let allCorrect = true;

    scenario.nodes.forEach(node => {
      const isCorrect = checkAnswer(inputs[node.id] || '', node.correctAnswers);
      newResults[node.id] = isCorrect;
      if (!isCorrect) allCorrect = false;
    });

    setResults(newResults);
    setIsGraded(true);

    if (allCorrect) {
      setMessage('정답입니다! 가계도 분석을 완벽하게 해냈어요! 🎉');
    } else {
      setMessage('틀린 부분을 다시 생각해서 고쳐보세요! 유전 법칙을 차근차근 따져보세요.');
    }
  };

  const handleReset = () => {
    setInputs({});
    setResults({});
    setIsGraded(false);
    setMessage('');
  };

  const nextLevel = () => {
    if (currentScenarioIndex < SCENARIOS.length - 1) {
      setCurrentScenarioIndex(prev => prev + 1);
    }
  };

  // Node styles
  const getNodeStyle = (node: PedigreeNode) => {
    const base = `relative flex flex-col items-center justify-center border-[3px] transition-all duration-300 shadow-sm`;
    const shape = node.sex === 'M' ? 'w-16 h-16 rounded-md' : 'w-16 h-16 rounded-full';
    const bg = node.affected ? 'bg-slate-700 text-white border-slate-800' : 'bg-white text-slate-800 border-slate-800';
    
    let borderStatus = '';
    if (isGraded) {
      borderStatus = results[node.id] ? 'border-emerald-500! ring-4 ring-emerald-500/10' : 'border-rose-500! ring-4 ring-rose-500/10';
    }

    return `${base} ${shape} ${bg} ${borderStatus}`;
  };

  return (
    <div className="min-h-screen p-4 md:p-8 flex items-center justify-center">
      <div className="w-full max-w-5xl flex flex-col gap-6">
        
        {/* Header / Tabs - Glass */}
        <header className="glass rounded-2xl p-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <span className="bg-blue-600 text-white p-2 rounded-xl shadow-lg shadow-blue-200">🧬</span>
            유전 가계도 마스터 <span className="text-blue-600">Self-Check</span>
          </h1>
          <div className="flex flex-wrap justify-center gap-2">
            {SCENARIOS.map((s, idx) => (
              <button
                key={s.id}
                onClick={() => setCurrentScenarioIndex(idx)}
                className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${
                  currentScenarioIndex === idx 
                    ? 'bg-blue-600 text-white shadow-xl shadow-blue-200 scale-105' 
                    : 'bg-white text-slate-500 hover:bg-white/80 border border-slate-100'
                }`}
              >
                Level {s.level}
              </button>
            ))}
          </div>
        </header>

        {/* Main Content - Glass */}
        <main className="glass flex-1 rounded-[2.5rem] p-8 md:p-12 relative overflow-hidden flex flex-col min-h-[700px]">
          <motion.div
            key={scenario.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.4 }}
            className="flex-1 flex flex-col"
          >
            <div className="mb-12 text-center">
              <h2 className="text-3xl font-black text-blue-900 mb-2">{scenario.title}</h2>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">{scenario.description}</p>
              
              <div className="mt-6 inline-flex items-center gap-3 bg-white/50 border border-white px-4 py-2 rounded-full text-sm text-blue-800 font-medium">
                <span className="bg-blue-100 text-blue-600 p-1 rounded-full"><Info className="w-4 h-4" /></span>
                {scenario.hint}
              </div>
            </div>

            {/* Pedigree Display */}
            <div className="relative flex-1 py-12 flex flex-col items-center">
              
              {/* Pedigree Lines using SVG */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-80" style={{ zIndex: 0 }}>
                {/* Gen 0 Connection */}
                <line x1="40%" y1="80" x2="60%" y2="80" stroke="#334155" strokeWidth="3" strokeLinecap="round" />
                <line x1="50%" y1="80" x2="50%" y2="150" stroke="#334155" strokeWidth="3" strokeLinecap="round" />
                
                {/* Gen 1 Siblings Connections */}
                {scenario.level === 4 ? (
                  <>
                    <line x1="20%" y1="150" x2="80%" y2="150" stroke="#334155" strokeWidth="3" strokeLinecap="round" />
                    {[20, 40, 60, 80].map(pos => (
                       <line key={pos} x1={`${pos}%`} y1="150" x2={`${pos}%`} y2="220" stroke="#334155" strokeWidth="3" strokeLinecap="round" />
                    ))}
                  </>
                ) : (
                  <>
                    <line x1="35%" y1="150" x2="65%" y2="150" stroke="#334155" strokeWidth="3" strokeLinecap="round" />
                    <line x1="35%" y1="150" x2="35%" y2="220" stroke="#334155" strokeWidth="3" strokeLinecap="round" />
                    <line x1="65%" y1="150" x2="65%" y2="220" stroke="#334155" strokeWidth="3" strokeLinecap="round" />
                  </>
                )}
              </svg>

              {/* People Rendering */}
              <div className="relative z-10 w-full">
                {/* Generation 0 */}
                <div className="flex justify-center gap-[12%] mb-32">
                  {scenario.nodes.filter(n => n.generation === 0).map(node => (
                    <div key={node.id} className="flex flex-col items-center gap-4">
                      <div className={getNodeStyle(node)}>
                        {node.phenotypeLabel && (
                          <span className="text-xl font-black">{node.phenotypeLabel}</span>
                        )}
                        {isGraded && (
                          <div className={`absolute -top-4 -right-4 p-1.5 rounded-full bg-white shadow-xl border-2 ${results[node.id] ? 'border-emerald-500 text-emerald-500' : 'border-rose-500 text-rose-500'}`}>
                            {results[node.id] ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                          </div>
                        )}
                      </div>
                      <div className="w-24">
                        <input
                          type="text"
                          value={inputs[node.id] || ''}
                          onChange={(e) => handleInputChange(node.id, e.target.value)}
                          placeholder="???"
                          className={`w-full px-3 py-2 text-center font-bold border-2 rounded-xl bg-white/80 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all ${
                            isGraded 
                              ? (results[node.id] ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700') 
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Generation 1 */}
                <div className={`flex justify-center ${scenario.level === 4 ? 'gap-[8%]' : 'gap-[22%]'}`}>
                  {scenario.nodes.filter(n => n.generation === 1).map(node => (
                    <div key={node.id} className="flex flex-col items-center gap-4">
                      <div className={getNodeStyle(node)}>
                        {node.phenotypeLabel && (
                          <span className="text-xl font-black">{node.phenotypeLabel}</span>
                        )}
                        {isGraded && (
                          <div className={`absolute -top-4 -right-4 p-1.5 rounded-full bg-white shadow-xl border-2 ${results[node.id] ? 'border-emerald-500 text-emerald-500' : 'border-rose-500 text-rose-500'}`}>
                            {results[node.id] ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                          </div>
                        )}
                      </div>
                      <div className="w-24">
                        <input
                          type="text"
                          value={inputs[node.id] || ''}
                          onChange={(e) => handleInputChange(node.id, e.target.value)}
                          placeholder="???"
                          className={`w-full px-3 py-2 text-center font-bold border-2 rounded-xl bg-white/80 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all ${
                            isGraded 
                              ? (results[node.id] ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700') 
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="mt-auto pt-10 flex flex-col md:flex-row justify-between items-end gap-6">
              <div className="glass rounded-2xl p-4 text-sm text-slate-600 border-white/50 shadow-sm self-start">
                <div className="flex items-center mb-1.5"><div className="w-4 h-4 border-2 border-slate-800 rounded-sm mr-2"></div> 남자</div>
                <div className="flex items-center mb-1.5"><div className="w-4 h-4 border-2 border-slate-800 rounded-full mr-2"></div> 여자</div>
                <div className="flex items-center"><div className="w-4 h-4 bg-slate-700 rounded-sm mr-2"></div> 형질 발현자</div>
              </div>

              <div className="flex flex-col items-end gap-4 w-full md:w-auto">
                <AnimatePresence mode="wait">
                  {message && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.9 }}
                      className={`font-bold text-center py-4 px-8 rounded-full shadow-lg flex items-center gap-3 animate-bounce ${
                        message.includes('정답') ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'
                      }`}
                    >
                      {message.includes('정답') ? '✨' : '❌'} {message}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex items-center gap-3 w-full md:w-auto">
                  <button
                    onClick={handleReset}
                    title="다시 하기"
                    className="p-4 rounded-2xl bg-white border border-slate-100 text-slate-400 hover:text-blue-600 hover:border-blue-100 transition-all group active:scale-90"
                  >
                    <RefreshCcw className="w-6 h-6 group-hover:rotate-180 transition-transform duration-500" />
                  </button>
                  <button
                    onClick={handleGrade}
                    className="flex-1 md:flex-none flex items-center justify-center gap-3 px-12 py-5 rounded-[2rem] bg-blue-600 text-white font-black text-xl shadow-2xl shadow-blue-400/30 hover:bg-blue-700 hover:scale-[1.02] active:scale-95 transition-all duration-300"
                  >
                    정답 확인하기
                  </button>
                  {isGraded && !message.includes('틀린') && currentScenarioIndex < SCENARIOS.length - 1 && (
                    <button
                      onClick={nextLevel}
                      className="flex items-center gap-2 px-8 py-5 rounded-[2rem] bg-indigo-600 text-white font-black text-xl shadow-2xl shadow-indigo-400/30 hover:bg-indigo-700 transition-all hover:translate-x-1"
                    >
                      Next
                      <ArrowRight className="w-6 h-6" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </main>
      </div>
    </div>
  );
}
