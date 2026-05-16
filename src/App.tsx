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
  label: string;
  sex: Sex;
  affected: boolean;
  phenotypeLabel?: string;
  x: number; // 0-100 percentage
  y: number; // 0-100 percentage
  requiredAnswers: string[][];
}

interface PedigreeLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface Scenario {
  id: string;
  level: number;
  title: string;
  description: string;
  nodes: PedigreeNode[];
  lines: PedigreeLine[];
  hint: string;
}

const SCENARIOS: Scenario[] = [
  {
    id: 'level1',
    level: 1,
    title: 'Level 1: 3대 상염색체 열성 (미맹)',
    description: '친가 가계도입니다. 조부모님은 정상이시지만 고모가 미맹(aa)입니다. 가족들의 유전자형을 추론해 보세요.',
    hint: '미맹(aa)인 자녀가 있다면 부모는 반드시 a를 가져야 합니다. (답이 여러 개면 "AA, Aa"처럼 모두 적으세요)',
    nodes: [
      { id: '1', label: '할아버지', sex: 'M', affected: false, x: 35, y: 10, requiredAnswers: [['Aa', 'aA']] },
      { id: '2', label: '할머니', sex: 'F', affected: false, x: 45, y: 10, requiredAnswers: [['Aa', 'aA']] },
      { id: '3', label: '고모', sex: 'F', affected: true, x: 25, y: 40, requiredAnswers: [['aa']] },
      { id: '4', label: '아버지', sex: 'M', affected: false, x: 40, y: 40, requiredAnswers: [['Aa', 'aA']] },
      { id: '5', label: '어머니', sex: 'F', affected: false, x: 55, y: 40, requiredAnswers: [['AA'], ['Aa', 'aA']] },
      { id: '6', label: '나', sex: 'M', affected: true, x: 47.5, y: 70, requiredAnswers: [['aa']] },
    ],
    lines: [
      { x1: 35, y1: 10, x2: 45, y2: 10 },
      { x1: 40, y1: 10, x2: 40, y2: 25 },
      { x1: 25, y1: 25, x2: 40, y2: 25 },
      { x1: 25, y1: 25, x2: 25, y2: 40 },
      { x1: 40, y1: 25, x2: 40, y2: 40 },
      { x1: 40, y1: 40, x2: 55, y2: 40 },
      { x1: 47.5, y1: 40, x2: 47.5, y2: 70 },
    ]
  },
  {
    id: 'level2',
    level: 2,
    title: 'Level 2: 3대 상염색체 우성 (보조개)',
    description: '외가 가계도입니다. 외할머니와 이모는 보조개가 없지만(aa), 엄마와 외할아버지는 보조개가 있습니다.',
    hint: '보조개가 있는 경우 A, 없는 경우 a입니다. 보조개가 없는(aa) 가족부터 분석해 보세요.',
    nodes: [
      { id: '1', label: '외할아버지', sex: 'M', affected: true, x: 55, y: 10, requiredAnswers: [['Aa', 'aA']] },
      { id: '2', label: '외할머니', sex: 'F', affected: false, x: 65, y: 10, requiredAnswers: [['aa']] },
      { id: '3', label: '이모', sex: 'F', affected: false, x: 50, y: 40, requiredAnswers: [['aa']] },
      { id: '4', label: '어머니', sex: 'F', affected: true, x: 65, y: 40, requiredAnswers: [['Aa', 'aA']] },
      { id: '5', label: '아버지', sex: 'M', affected: false, x: 35, y: 40, requiredAnswers: [['aa']] },
      { id: '6', label: '나', sex: 'F', affected: true, x: 50, y: 70, requiredAnswers: [['Aa', 'aA']] },
    ],
    lines: [
      { x1: 55, y1: 10, x2: 65, y2: 10 },
      { x1: 60, y1: 10, x2: 60, y2: 25 },
      { x1: 50, y1: 25, x2: 65, y2: 25 },
      { x1: 50, y1: 25, x2: 50, y2: 40 },
      { x1: 65, y1: 25, x2: 65, y2: 40 },
      { x1: 35, y1: 40, x2: 65, y2: 40 },
      { x1: 50, y1: 40, x2: 50, y2: 70 },
    ]
  },
  {
    id: 'level3',
    level: 3,
    title: 'Level 3: 3대 반성 유전 (색맹)',
    description: '외할아버지는 색맹이시고 외할머니는 정상이십니다. 엄마는 정상인데 남동생이 색맹입니다.',
    hint: "남자는 XY, 여자는 XX입니다. 색맹 유전자는 X'로 표시해 보세요.",
    nodes: [
      { id: '1', label: '외할아버지', sex: 'M', affected: true, x: 55, y: 10, requiredAnswers: [["X'Y"]] },
      { id: '2', label: '외할머니', sex: 'F', affected: false, x: 65, y: 10, requiredAnswers: [['XX'], ["XX'", "X'X"]] },
      { id: '3', label: '어머니', sex: 'F', affected: false, x: 60, y: 40, requiredAnswers: [["XX'", "X'X"]] },
      { id: '4', label: '아버지', sex: 'M', affected: false, x: 45, y: 40, requiredAnswers: [['XY']] },
      { id: '5', label: '나(여)', sex: 'F', affected: false, x: 40, y: 70, requiredAnswers: [['XX'], ["XX'", "X'X"]] },
      { id: '6', label: '동생(남)', sex: 'M', affected: true, x: 55, y: 70, requiredAnswers: [["X'Y"]] },
    ],
    lines: [
      { x1: 55, y1: 10, x2: 65, y2: 10 },
      { x1: 60, y1: 10, x2: 60, y2: 40 },
      { x1: 45, y1: 40, x2: 60, y2: 40 },
      { x1: 52.5, y1: 40, x2: 52.5, y2: 55 },
      { x1: 40, y1: 55, x2: 55, y2: 55 },
      { x1: 40, y1: 55, x2: 40, y2: 70 },
      { x1: 55, y1: 55, x2: 55, y2: 70 },
    ]
  },
  {
    id: 'level4',
    level: 4,
    title: 'Level 4: 3대 ABO식 혈액형',
    description: '친할아버지(A)와 친할머니(B) 사이에서 O형인 아버지가 태어났습니다. 가족의 유전자형을 완성하세요.',
    hint: 'O형 자녀(OO)가 태어난 것을 통해 조부모님의 유전자형을 알 수 있습니다.',
    nodes: [
      { id: '1', label: '할아버지', sex: 'M', affected: false, phenotypeLabel: 'A', x: 30, y: 10, requiredAnswers: [['AO', 'OA']] },
      { id: '2', label: '할머니', sex: 'F', affected: false, phenotypeLabel: 'B', x: 40, y: 10, requiredAnswers: [['BO', 'OB']] },
      { id: '3', label: '큰아버지', sex: 'M', affected: false, phenotypeLabel: 'AB', x: 20, y: 40, requiredAnswers: [['AB', 'BA']] },
      { id: '4', label: '아버지', sex: 'M', affected: false, phenotypeLabel: 'O', x: 35, y: 40, requiredAnswers: [['OO']] },
      { id: '5', label: '어머니', sex: 'F', affected: false, phenotypeLabel: 'A', x: 50, y: 40, requiredAnswers: [['AO', 'OA']] },
      { id: '6', label: '나', sex: 'F', affected: false, phenotypeLabel: 'O', x: 42.5, y: 70, requiredAnswers: [['OO']] },
    ],
    lines: [
      { x1: 30, y1: 10, x2: 40, y2: 10 },
      { x1: 35, y1: 10, x2: 35, y2: 25 },
      { x1: 20, y1: 25, x2: 35, y2: 25 },
      { x1: 20, y1: 25, x2: 20, y2: 40 },
      { x1: 35, y1: 25, x2: 35, y2: 40 },
      { x1: 35, y1: 40, x2: 50, y2: 40 },
      { x1: 42.5, y1: 40, x2: 42.5, y2: 70 },
    ]
  }
];

// --- Helper Functions ---

const normalizeGenotype = (input: string) => {
  return input.trim().replace(/ /g, '').toLowerCase();
};

const checkAnswer = (input: string, requiredGroups: string[][]) => {
  const studentParts = input.split(/[,/ ]+/).filter(p => p.trim() !== '').map(normalizeGenotype);
  if (studentParts.length === 0) return false;

  const groupsCovered = requiredGroups.every(group => {
    return group.some(variant => studentParts.includes(normalizeGenotype(variant)));
  });

  const allPartsValid = studentParts.every(part => {
    return requiredGroups.some(group => group.some(v => normalizeGenotype(v) === part));
  });

  return groupsCovered && allPartsValid && studentParts.length === requiredGroups.length;
};

// --- Components ---

export default function App() {
  const [currentScenarioIndex, setCurrentScenarioIndex] = useState(0);
  const [inputs, setInputs] = useState<{ [key: string]: string }>({});
  const [results, setResults] = useState<{ [key: string]: boolean }>({});
  const [isGraded, setIsGraded] = useState(false);
  const [message, setMessage] = useState('');

  const scenario = SCENARIOS[currentScenarioIndex];

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
      const isCorrect = checkAnswer(inputs[node.id] || '', node.requiredAnswers);
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

  const getNodeStyle = (node: PedigreeNode) => {
    const base = `relative flex flex-col items-center justify-center border-[3px] transition-all duration-300 shadow-sm`;
    const shape = node.sex === 'M' ? 'w-14 h-14 rounded-md' : 'w-14 h-14 rounded-full';
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
                  currentScenarioIndex === idx ? 'bg-blue-600 text-white shadow-xl shadow-blue-200 scale-105' : 'bg-white text-slate-500 hover:bg-white/80 border border-slate-100'
                }`}
              >
                Level {s.level}
              </button>
            ))}
          </div>
        </header>

        <main className="glass flex-1 rounded-[2.5rem] p-8 md:p-12 relative overflow-hidden flex flex-col min-h-[750px]">
          <motion.div key={scenario.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }} className="flex-1 flex flex-col">
            <div className="mb-8 text-center">
              <h2 className="text-3xl font-black text-blue-900 mb-2">{scenario.title}</h2>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">{scenario.description}</p>
              <div className="mt-6 inline-flex items-center gap-3 bg-white/50 border border-white px-4 py-2 rounded-full text-sm text-blue-800 font-medium font-sans">
                <span className="bg-blue-100 text-blue-600 p-1 rounded-full"><Info className="w-4 h-4" /></span>
                {scenario.hint}
              </div>
            </div>

            <div className="relative flex-1 py-4 flex flex-col items-center">
              <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-80" style={{ zIndex: 0 }}>
                {scenario.lines.map((line, idx) => (
                  <line key={idx} x1={`${line.x1}%`} y1={`${line.y1}%`} x2={`${line.x2}%`} y2={`${line.y2}%`} stroke="#334155" strokeWidth="3" strokeLinecap="round" />
                ))}
              </svg>

              <div className="relative z-10 w-full h-full">
                {scenario.nodes.map(node => (
                  <div key={node.id} className="absolute flex flex-col items-center gap-2 transform -translate-x-1/2 -translate-y-1/2" style={{ left: `${node.x}%`, top: `${node.y}%` }}>
                    <span className="text-xs font-bold text-slate-500 bg-white/80 px-2 py-0.5 rounded-full border border-slate-100 mb-1">{node.label}</span>
                    <div className={getNodeStyle(node)}>
                      {node.phenotypeLabel && <span className="text-xl font-black">{node.phenotypeLabel}</span>}
                      {isGraded && (
                        <div className={`absolute -top-3 -right-3 p-1 rounded-full bg-white shadow-xl border-2 ${results[node.id] ? 'border-emerald-500 text-emerald-500' : 'border-rose-500 text-rose-500'}`}>
                          {results[node.id] ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                        </div>
                      )}
                    </div>
                    <div className="w-24 mt-1">
                      <input
                        type="text"
                        value={inputs[node.id] || ''}
                        onChange={(e) => handleInputChange(node.id, e.target.value)}
                        placeholder="???"
                        className={`w-full px-2 py-1.5 text-center font-bold border-2 rounded-xl bg-white/90 shadow-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-sm ${
                          isGraded ? (results[node.id] ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700') : 'border-slate-200 hover:border-slate-300'
                        }`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-auto pt-8 flex flex-col md:flex-row justify-between items-end gap-6">
              <div className="glass rounded-2xl p-4 text-xs text-slate-600 border-white/50 shadow-sm self-start">
                <div className="flex items-center mb-1.5"><div className="w-3 h-3 border-2 border-slate-800 rounded-sm mr-2"></div> 남자</div>
                <div className="flex items-center mb-1.5"><div className="w-3 h-3 border-2 border-slate-800 rounded-full mr-2"></div> 여자</div>
                <div className="flex items-center"><div className="w-3 h-3 bg-slate-700 rounded-sm mr-2"></div> 형질 발현자</div>
              </div>

              <div className="flex flex-col items-end gap-4 w-full md:w-auto">
                <AnimatePresence mode="wait">
                  {message && (
                    <motion.div initial={{ opacity: 0, y: 10, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.9 }} className={`font-bold text-center py-3 px-6 rounded-full shadow-lg flex items-center gap-3 animate-bounce ${message.includes('정답') ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'}`}>
                      {message.includes('정답') ? '✨' : '❌'} {message}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex items-center gap-3 w-full md:w-auto">
                  <button onClick={handleReset} className="p-4 rounded-2xl bg-white border border-slate-100 text-slate-400 hover:text-blue-600 hover:border-blue-100 transition-all group active:scale-90 shadow-sm">
                    <RefreshCcw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
                  </button>
                  <button onClick={handleGrade} className="flex-1 md:flex-none px-12 py-4 rounded-[2rem] bg-blue-600 text-white font-black text-lg shadow-2xl shadow-blue-400/30 hover:bg-blue-700 hover:scale-[1.02] active:scale-95 transition-all duration-300">
                    정답 확인하기
                  </button>
                  {isGraded && !message.includes('틀린') && currentScenarioIndex < SCENARIOS.length - 1 && (
                    <button onClick={nextLevel} className="flex items-center gap-2 px-8 py-4 rounded-[2rem] bg-indigo-600 text-white font-black text-lg shadow-2xl shadow-indigo-400/30 hover:bg-indigo-700 transition-all hover:translate-x-1">
                      Next <ArrowRight className="w-5 h-5" />
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
