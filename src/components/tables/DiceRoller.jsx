import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const DiceRoller = () => {
  const [dieType, setDieType] = useState(6);
  const [numDice, setNumDice] = useState(1);
  const [results, setResults] = useState([]);
  const [total, setTotal] = useState(0);
  const [history, setHistory] = useState([]);

  const handleRoll = () => {
    const newResults = Array.from({ length: numDice }, () =>
      Math.floor(Math.random() * dieType) + 1
    );
    const newTotal = newResults.reduce((acc, curr) => acc + curr, 0);
    setResults(newResults);
    setTotal(newTotal);
    setHistory((prevHistory) => [
      `${numDice}d${dieType} = ${newTotal}`,
      ...prevHistory.slice(0, 4),
    ]);
  };

  return (
    <div className="rounded-xl border border-border bg-card/50 p-4">
      <h2 className="mb-3 text-lg font-semibold">Générateur de Dés</h2>
      <div>
        <div className="flex space-x-2">
          <Select value={String(dieType)} onValueChange={(v) => setDieType(Number(v))}>
            <SelectTrigger>
              <SelectValue placeholder="Type de dé" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="4">d4</SelectItem>
              <SelectItem value="6">d6</SelectItem>
              <SelectItem value="8">d8</SelectItem>
              <SelectItem value="10">d10</SelectItem>
              <SelectItem value="12">d12</SelectItem>
              <SelectItem value="20">d20</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="number"
            value={numDice}
            onChange={(e) => setNumDice(Number(e.target.value))}
            min={1}
            max={20}
            placeholder="Nombre de dés"
          />
          <Button onClick={handleRoll}>Lancer</Button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {results.map((result, index) => (
            <span
              key={index}
              className={`badge ${
                result === 1 ? 'text-destructive' : ''
              } ${result === dieType ? 'text-green-600' : ''}`}
            >
              {result}
            </span>
          ))}
        </div>
        <div className="mt-4 text-2xl font-bold">{total}</div>
        <div className="mt-4">
          {history.map((entry, index) => (
            <div key={index}>{entry}</div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DiceRoller;
