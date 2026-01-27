import React, { useEffect, useMemo, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { Menu, X, Shuffle, Trash2, Target } from 'lucide-react';

interface Option {
  value: string;
  index: number;
}

function App() {
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState<Option | null>(null);
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  // 🎯 Modo ganador al 3er giro
  const [thirdSpinMode, setThirdSpinMode] = useState(false);
  const [spinCounter, setSpinCounter] = useState(0);
  // 🎯 Control de descarte
const [isDiscarded, setIsDiscarded] = useState(false);



  const [allOptions, setAllOptions] = useState<string[]>([]);
  const [eliminatedOptions, setEliminatedOptions] = useState<string[]>([]);
  const [optionsInput, setOptionsInput] = useState('');
  const [currentOption, setCurrentOption] = useState('');
  const [showOptions, setShowOptions] = useState(true);

  const wheelRef = useRef<HTMLDivElement>(null);
  const optionChangeInterval = useRef<NodeJS.Timeout | null>(null);
  const optionsBuffer = useRef<string[]>([]);

  const spinSound = useRef<HTMLAudioElement | null>(null);
  const winSound = useRef<HTMLAudioElement | null>(null);

  const DIVISIONS = 150;
  const SPIN_DURATION = 10000;
  const BUFFER_SIZE = 3000;
  const DISPLAY_CHUNK_SIZE = 100;

  /* ================= OPCIONES ================= */
  useEffect(() => {
  if (!thirdSpinMode) {
    setSpinCounter(0);
  }
}, [thirdSpinMode]);


  const availableOptions = useMemo(() => {
    return allOptions.filter(o => !eliminatedOptions.includes(o));
  }, [allOptions, eliminatedOptions]);

  const processOptions = () => {
    const options = optionsInput
      .split('\n')
      .map(o => o.trim())
      .filter(Boolean);

    if (!options.length) return;

    setAllOptions(prev => [...prev, ...options]);
    setOptionsInput('');

    if (!currentOption) {
      setCurrentOption(options[0]);
    }
  };

  const clearAllOptions = () => {
    setAllOptions([]);
    setEliminatedOptions([]);
    setCurrentOption('');
  };

  const removeOption = (index: number) => {
    setAllOptions(prev => prev.filter((_, i) => i !== index));
  };

  const restoreEliminatedOptions = () => {
    setEliminatedOptions([]);
  };

  /* ================= RULETA ================= */

  const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

  const calculateFinalRotation = () => {
    const slice = 360 / DIVISIONS;
    const randomDivision = Math.floor(Math.random() * DIVISIONS);
    const target = 360 - randomDivision * slice;
    const spins = Math.floor(Math.random() * 6) + 12;
    return spins * 360 + target;
  };

  const animateWheel = (start: number, end: number, duration: number) => {
    const startTime = performance.now();

    const animate = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = easeOut(progress);
      const value = start + (end - start) * eased;

      if (wheelRef.current) {
        wheelRef.current.style.transform = `rotate(${value}deg)`;
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  };

  /* ================= TEXTO / CUADRO ================= */

  const prepareOptionsBuffer = () => {
    const buffer: string[] = [];
    const total = availableOptions.length;
    const size = Math.min(total, BUFFER_SIZE);

    for (let i = 0; i < size; i++) {
      buffer.push(availableOptions[Math.floor(Math.random() * total)]);
    }

    optionsBuffer.current = buffer;
  };

  const startChangingOptions = () => {
    if (!availableOptions.length) return;

    prepareOptionsBuffer();
    let index = 0;

    optionChangeInterval.current = setInterval(() => {
      setCurrentOption(
        optionsBuffer.current[index % optionsBuffer.current.length]
      );
      index++;
    }, 70); // ← velocidad estable (sin trabarse)
  };

  const stopChangingOptions = () => {
    if (optionChangeInterval.current) {
      clearInterval(optionChangeInterval.current);
      optionChangeInterval.current = null;
    }
  };

  /* ================= GANADOR ================= */

  const getRandomWinner = (): Option | null => {
    if (!availableOptions.length) return null;
    const index = Math.floor(Math.random() * availableOptions.length);
    return {
      value: availableOptions[index],
      index: allOptions.indexOf(availableOptions[index])
    };
  };

  const triggerConfetti = () => {
    confetti({
      particleCount: 300,
      spread: 100,
      origin: { y: 0.7 }
    });
  };

  const spinWheel = () => {
  if (spinning || !availableOptions.length) return;

  setSpinning(true);
  setWinner(null);
  setShowWinnerModal(false);
  setIsDiscarded(false);

  spinSound.current?.play();

  let result: Option | null = null;
  let discarded = false;

  // 🎯 MODO 3er GIRO
  if (thirdSpinMode) {
    setSpinCounter(prev => prev + 1);

    if (spinCounter < 2) {
      // ❌ Giro 1 y 2 → DESCARTADO
      result = getRandomWinner();
      discarded = true;
    } else {
      // 🏆 Giro 3 → GANADOR REAL
      result = getRandomWinner();
      discarded = false;
    }
  } else {
    // 🎯 DESACTIVADO → normal
    result = getRandomWinner();
  }

  const rotation = calculateFinalRotation();

  startChangingOptions();
  animateWheel(0, rotation, SPIN_DURATION);

  setTimeout(() => {
    stopChangingOptions();
    spinSound.current?.pause();

    if (result) {
      setCurrentOption(result.value);
      setWinner(result);
      setIsDiscarded(discarded);
      setEliminatedOptions(prev => [...prev, result.value]);
      setShowWinnerModal(true);

      if (!discarded) {
        winSound.current?.play();
        triggerConfetti();
      }
    }

    setSpinning(false);
  }, SPIN_DURATION);
};


  /* ================= EFECTOS ================= */

  useEffect(() => {
    spinSound.current = new Audio('');
    winSound.current = new Audio('');

    spinSound.current.loop = true;
    spinSound.current.volume = 0.3;
    winSound.current.volume = 0.3;

    return stopChangingOptions;
  }, []);

  const displayOptions = useMemo(() => {
    return allOptions.slice(0, DISPLAY_CHUNK_SIZE).map((opt, index) => (
      <div
        key={index}
        className="flex items-center justify-between py-2 border-b"
      >
        <span
          className={
            eliminatedOptions.includes(opt)
              ? 'line-through opacity-50'
              : ''
          }
        >
          {opt}
        </span>
        <button
          onClick={() => removeOption(index)}
          className="text-red-500 hover:text-red-700"
        >
          <X size={18} />
        </button>
      </div>
    ));
  }, [allOptions, eliminatedOptions]);

  /* ================= UI ================= */

  return (
    <div className="min-h-screen bg-[url('/images/fondoCopebaFest.jpg')] bg-contain bg-no-repeat bg-center p-4">

      {/* BOTÓN MENÚ */}
      <button
        onClick={() => setShowOptions(!showOptions)}
        className="fixed top-4 left-4 z-50 bg-white p-2 rounded-full shadow-lg"
      >
        <Menu size={24} />
      </button>

      {/* 👇 BAJAMOS TODO EL CONTENIDO */}
      <div className="flex justify-center gap-5 mt-24">

        {/* PANEL OPCIONES */}
        {showOptions && (
          <div className="w-100 bg-white p-6 rounded-lg shadow-lg h-fit">
            <div className="flex justify-between items-center mb-4">
  <h2 className="text-xl font-bold text-green-800">Opciones</h2>

  <div className="flex items-center gap-2">
    {/* 🎯 BOTÓN 3er GIRO */}
    <button
  onClick={() => {
    setThirdSpinMode(prev => !prev);
    setSpinCounter(0);
  }}
  title="Ganador hasta el 3er giro"
  className={`
    p-2 rounded-full border transition
    ${thirdSpinMode
      ? 'bg-yellow-400 border-yellow-500'
      : 'bg-gray-200 border-gray-300'}
  `}
>
  🎯
</button>


    {/* 🗑️ BORRAR */}
    <button
      onClick={clearAllOptions}
      className="text-red-500 hover:text-red-700"
    >
      <Trash2 size={20} />
    </button>
  </div>
</div>


            <textarea
              value={optionsInput}
              onChange={e => setOptionsInput(e.target.value)}
              className="w-full h-32 p-2 border rounded mb-4"
              placeholder="Ingresa una opción por línea"
            />

            <button
              onClick={processOptions}
              className="w-full bg-blue-600 text-white py-2 rounded mb-4"
            >
              <Shuffle size={18} className="inline mr-1" />
              Agregar opciones
            </button>

            <p className="text-sm mb-2">
              Total: {allOptions.length} | Eliminados: {eliminatedOptions.length}
            </p>

            {eliminatedOptions.length > 0 && (
              <button
                onClick={restoreEliminatedOptions}
                className="mb-3 text-sm bg-blue-500 text-white px-2 py-1 rounded"
              >
                Restaurar eliminados
              </button>
            )}

            <div className="max-h-48 overflow-y-auto">{displayOptions}</div>

            <button
              onClick={() => setShowOptions(false)}
              className="w-full mt-4 bg-green-600 text-white py-2 rounded"
            >
              Comenzar
            </button>
          </div>
        )}
          {/* CONTENEDOR GENERAL (solo baja todo) */}
<div className="flex flex-col items-center gap-6 mt-24">

  {/* 🔹 CONTENEDOR DESPLAZADO A LA DERECHA (SOLO RULETA + CUADRO) */}
  <div className="flex justify-center w-full translate-x-48">
    
    <div className="flex items-center gap-6">

      {/* RULETA */}
      <div className="relative">
        <div
          ref={wheelRef}
          className="w-[520px] h-[520px] rounded-full wheel-gradient wheel-shadow relative"
        >
          <div className="absolute inset-1/3 center-circle rounded-full flex items-center justify-center">
            <div className="center-logo">
              <span className="text-lg font-bold text-green-800">
                COPEBA 
              </span>
            </div>
          </div>
        </div>

        {/* FLECHA */}
        {!showWinnerModal && (
          <div className="absolute top-1/2 right-[-30px] -translate-y-1/2 z-20">
            <div className="arrow" style={{ transform: 'rotate(-270deg)' }} />
          </div>
        )}
      </div>

      {/* CUADRO */}
      <div className="h-[100px] flex items-center">
        <div className="w-[350px] px-6 py-2 bg-white rounded-2xl shadow-xl border-4 border-green-600 text-center flex items-center justify-center">
          {spinning ? (
            <span className="text-xl font-extrabold text-green-700 animate-pulse whitespace-nowrap overflow-hidden text-ellipsis max-w-full">
              {currentOption || 'Girando...'}
            </span>
          ) : currentOption ? (
            <span className="text-2xl font-extrabold text-green-800 whitespace-nowrap overflow-hidden text-ellipsis max-w-full">
              {currentOption}
            </span>

          ) : (
            <span className="text-gray-400 text-lg whitespace-nowrap overflow-hidden text-ellipsis max-w-full">
              Sin opciones
            </span>
          )}
        </div>
      </div>

    </div>
  </div>

  {/* 🔹 BOTÓN (centrado, solo bajado) */}
  <button
    onClick={spinWheel}
    disabled={spinning}
    className="mt-6 px-8 py-4 bg-green-600 text-white rounded-full text-xl"
  >
    {spinning ? '¡Girando!' : 'Girar Ruleta'}
  </button>

</div>


       </div>

      {/* MODAL GANADOR */}
            {showWinnerModal && winner && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-xl text-center min-w-[300px]">

            {isDiscarded ? (
              <>
                <h2 className="text-2xl font-bold text-red-600 mb-4">
                  ❌ DESCARTADO
                </h2>
                <p className="text-xl mb-6 text-gray-700">
                  {winner.value}
                </p>
              </>
            ) : (
              <>
                <h2 className="text-2xl font-bold text-green-700 mb-4">
                  🎉 ¡Felicidades al Ganador!
                </h2>
                <p className="text-xl mb-6">
                  {winner.value}
                </p>
              </>
            )}

            <button
              onClick={() => setShowWinnerModal(false)}
              className={`px-6 py-2 rounded text-white ${
                isDiscarded ? 'bg-gray-500' : 'bg-green-600'
              }`}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

