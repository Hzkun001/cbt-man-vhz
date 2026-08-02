import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { X, Delete, Calculator } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// --- DATA NILAI NORMAL KESEHATAN (HARDCODED UNTUK MEDIS) ---
const NORMAL_VALUES = {
  'Tanda Vital': [
    { parameter: 'Tekanan Darah (Sistolik)', range: '90 - 120', unit: 'mmHg' },
    { parameter: 'Tekanan Darah (Diastolik)', range: '60 - 80', unit: 'mmHg' },
    { parameter: 'Detak Jantung (Nadi)', range: '60 - 100', unit: 'x/menit' },
    { parameter: 'Laju Pernapasan (RR)', range: '12 - 20', unit: 'x/menit' },
    { parameter: 'Suhu Tubuh', range: '36.5 - 37.2', unit: '°C' },
    { parameter: 'Saturasi Oksigen (SpO2)', range: '95 - 100', unit: '%' },
  ],
  'Hematologi': [
    { parameter: 'Hemoglobin (Pria)', range: '13.8 - 17.2', unit: 'g/dL' },
    { parameter: 'Hemoglobin (Wanita)', range: '12.1 - 15.1', unit: 'g/dL' },
    { parameter: 'Leukosit (WBC)', range: '4.5 - 11.0', unit: '10^3/µL' },
    { parameter: 'Trombosit (Platelet)', range: '150 - 450', unit: '10^3/µL' },
    { parameter: 'Hematokrit (Pria)', range: '40.7 - 50.3', unit: '%' },
    { parameter: 'Hematokrit (Wanita)', range: '36.1 - 44.3', unit: '%' },
  ],
  'Kimia Klinik': [
    { parameter: 'Gula Darah Puasa (GDP)', range: '70 - 99', unit: 'mg/dL' },
    { parameter: 'Gula Darah 2 Jam PP', range: '< 140', unit: 'mg/dL' },
    { parameter: 'Gula Darah Sewaktu (GDS)', range: '< 200', unit: 'mg/dL' },
    { parameter: 'Kolesterol Total', range: '< 200', unit: 'mg/dL' },
    { parameter: 'Trigliserida', range: '< 150', unit: 'mg/dL' },
    { parameter: 'Asam Urat (Pria)', range: '3.4 - 7.0', unit: 'mg/dL' },
    { parameter: 'Asam Urat (Wanita)', range: '2.4 - 6.0', unit: 'mg/dL' },
  ],
};

export function NormalValuesTable() {
  return (
    <Tabs defaultValue="Tanda Vital" className="w-full">
      <TabsList className="w-full flex overflow-x-auto h-auto p-1 mb-2">
        {Object.keys(NORMAL_VALUES).map((cat) => (
          <TabsTrigger key={cat} value={cat} className="flex-1 text-xs py-2 px-2 whitespace-nowrap">
            {cat}
          </TabsTrigger>
        ))}
      </TabsList>
      {Object.entries(NORMAL_VALUES).map(([cat, items]) => (
        <TabsContent key={cat} value={cat} className="mt-0">
          <div className="overflow-x-auto rounded-md border border-slate-200 dark:border-slate-800">
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-slate-900">
                <TableRow>
                  <TableHead className="text-xs h-8">Parameter</TableHead>
                  <TableHead className="text-xs h-8">Normal</TableHead>
                  <TableHead className="text-xs h-8">Satuan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="py-2 text-xs font-medium">{item.parameter}</TableCell>
                    <TableCell className="py-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">{item.range}</TableCell>
                    <TableCell className="py-2 text-xs text-slate-500">{item.unit}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      ))}
    </Tabs>
  );
}

function evaluateMathExpression(expr: string): number {
  const sanitized = expr.replace(/÷/g, "/").replace(/×/g, "*").replace(/−/g, "-");
  if (!/^[0-9\s.+\-*/%()]+$/.test(sanitized)) {
    throw new Error("Invalid math expression");
  }

  const expanded = sanitized.replace(/(\d+(?:\.\d+)?)%/g, "($1/100)");
  const tokens = expanded.match(/\d+(?:\.\d+)?|[+\-*/()]/g);
  if (!tokens) throw new Error("No tokens");

  let pos = 0;

  function parsePrimary(): number {
    if (pos >= tokens!.length) throw new Error("Unexpected end");
    const token = tokens![pos++];
    if (token === "(") {
      const val = parseExpr();
      if (tokens![pos++] !== ")") throw new Error("Missing closing paren");
      return val;
    }
    const num = parseFloat(token);
    if (isNaN(num)) throw new Error("Invalid number: " + token);
    return num;
  }

  function parseMultiplicative(): number {
    let left = parsePrimary();
    while (pos < tokens!.length && (tokens![pos] === "*" || tokens![pos] === "/")) {
      const op = tokens![pos++];
      const right = parsePrimary();
      left = op === "*" ? left * right : (right !== 0 ? left / right : NaN);
    }
    return left;
  }

  function parseExpr(): number {
    let left = parseMultiplicative();
    while (pos < tokens!.length && (tokens![pos] === "+" || tokens![pos] === "-")) {
      const op = tokens![pos++];
      const right = parseMultiplicative();
      left = op === "+" ? left + right : left - right;
    }
    return left;
  }

  const result = parseExpr();
  if (isNaN(result) || !isFinite(result)) throw new Error("Math error");
  return result;
}

// --- KALKULATOR ILMIAH ---
export function ScientificCalculator() {
  const [display, setDisplay] = useState('0');
  const [equation, setEquation] = useState('');

  const handlePress = (val: string) => {
    if (display === 'Error') setDisplay(val);
    else if (display === '0' && val !== '.') setDisplay(val);
    else setDisplay(display + val);
  };

  const handleClear = () => {
    setDisplay('0');
    setEquation('');
  };

  const handleDelete = () => {
    if (display === 'Error' || display.length === 1) setDisplay('0');
    else setDisplay(display.slice(0, -1));
  };

  const calculate = () => {
    try {
      const evalResult = evaluateMathExpression(display);
      setEquation(display + ' =');
      setDisplay(String(Math.round(evalResult * 1000000) / 1000000));
    } catch (err) {
      setDisplay('Error');
    }
  };

  const advancedOp = (op: string) => {
    try {
      const current = parseFloat(display);
      let res = 0;
      switch (op) {
        case 'sin': res = Math.sin(current); break;
        case 'cos': res = Math.cos(current); break;
        case 'tan': res = Math.tan(current); break;
        case 'log': res = Math.log10(current); break;
        case 'ln': res = Math.log(current); break;
        case 'sqrt': res = Math.sqrt(current); break;
        case 'sq': res = Math.pow(current, 2); break;
        case 'inv': res = 1 / current; break;
      }
      setEquation(`${op}(${display}) =`);
      // truncate to 6 decimals to avoid crazy numbers
      setDisplay(String(Math.round(res * 1000000) / 1000000));
    } catch (e) {
      setDisplay('Error');
    }
  };

  const btnClass = "h-10 text-sm font-semibold active:scale-95 transition-transform bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100";
  const opClass = "h-10 text-sm font-bold active:scale-95 transition-transform bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/50 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300";
  const advClass = "h-8 text-xs active:scale-95 transition-transform bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300";

  return (
    <div className="flex flex-col gap-2 w-full max-w-xs mx-auto">
      {/* Display */}
      <div className="bg-slate-900 rounded-lg p-3 flex flex-col items-end justify-end h-20 shadow-inner">
        <div className="text-xs text-slate-400 h-4">{equation}</div>
        <div className="text-2xl font-mono text-white tracking-wider truncate w-full text-right">{display}</div>
      </div>
      
      {/* Scientific Row */}
      <div className="grid grid-cols-4 gap-1 mb-1">
        <Button variant="ghost" className={advClass} onClick={() => advancedOp('sin')}>sin</Button>
        <Button variant="ghost" className={advClass} onClick={() => advancedOp('cos')}>cos</Button>
        <Button variant="ghost" className={advClass} onClick={() => advancedOp('tan')}>tan</Button>
        <Button variant="ghost" className={advClass} onClick={() => advancedOp('log')}>log</Button>
        
        <Button variant="ghost" className={advClass} onClick={() => advancedOp('ln')}>ln</Button>
        <Button variant="ghost" className={advClass} onClick={() => advancedOp('sqrt')}>√x</Button>
        <Button variant="ghost" className={advClass} onClick={() => advancedOp('sq')}>x²</Button>
        <Button variant="ghost" className={advClass} onClick={() => advancedOp('inv')}>1/x</Button>
      </div>

      {/* Main Numpad */}
      <div className="grid grid-cols-4 gap-1.5">
        <Button variant="ghost" className={cn(opClass, "text-red-600 dark:text-red-400 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50")} onClick={handleClear}>AC</Button>
        <Button variant="ghost" className={cn(opClass, "text-orange-600 dark:text-orange-400 bg-orange-100 hover:bg-orange-200 dark:bg-orange-900/30 dark:hover:bg-orange-900/50")} onClick={handleDelete}><Delete className="h-4 w-4" /></Button>
        <Button variant="ghost" className={opClass} onClick={() => handlePress('%')}>%</Button>
        <Button variant="ghost" className={opClass} onClick={() => handlePress('/')}>÷</Button>

        <Button variant="ghost" className={btnClass} onClick={() => handlePress('7')}>7</Button>
        <Button variant="ghost" className={btnClass} onClick={() => handlePress('8')}>8</Button>
        <Button variant="ghost" className={btnClass} onClick={() => handlePress('9')}>9</Button>
        <Button variant="ghost" className={opClass} onClick={() => handlePress('*')}>×</Button>

        <Button variant="ghost" className={btnClass} onClick={() => handlePress('4')}>4</Button>
        <Button variant="ghost" className={btnClass} onClick={() => handlePress('5')}>5</Button>
        <Button variant="ghost" className={btnClass} onClick={() => handlePress('6')}>6</Button>
        <Button variant="ghost" className={opClass} onClick={() => handlePress('-')}>−</Button>

        <Button variant="ghost" className={btnClass} onClick={() => handlePress('1')}>1</Button>
        <Button variant="ghost" className={btnClass} onClick={() => handlePress('2')}>2</Button>
        <Button variant="ghost" className={btnClass} onClick={() => handlePress('3')}>3</Button>
        <Button variant="ghost" className={opClass} onClick={() => handlePress('+')}>+</Button>

        <Button variant="ghost" className={cn(btnClass, "col-span-2")} onClick={() => handlePress('0')}>0</Button>
        <Button variant="ghost" className={btnClass} onClick={() => handlePress('.')}>.</Button>
        <Button variant="ghost" className={cn(opClass, "bg-emerald-500 hover:bg-emerald-600 text-white dark:bg-emerald-600 dark:hover:bg-emerald-700 dark:text-white")} onClick={calculate}>=</Button>
      </div>
    </div>
  );
}
