import React, { useState, useRef, useEffect, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { Menu, X, Shuffle, Trash2 } from 'lucide-react';

interface Option {
  value: string;
  index: number;
}

function App() {
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [winner, setWinner] = useState<Option | null>(null);
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const [arrowBounce, setArrowBounce] = useState(false);
  const [allOptions, setAllOptions] = useState<string[]>([]);
  const [eliminatedOptions, setEliminatedOptions] = useState<string[]>([]);
  const [optionsInput, setOptionsInput] = useState('');
  const [currentOption, setCurrentOption] = useState('');
  const [showOptions, setShowOptions] = useState(true);
  const [optionChangeSpeed, setOptionChangeSpeed] = useState(30);
  
  const animationRef = useRef<number>();
  const spinSound = useRef<HTMLAudioElement | null>(null);
  const winSound = useRef<HTMLAudioElement | null>(null);
  const optionChangeInterval = useRef<NodeJS.Timeout>();
  const optionsBuffer = useRef<string[]>([]);
  const currentChunkIndex = useRef(0);

  // Optimized constants for better performance
  const CHUNK_SIZE = 1000; // Reduced chunk size for smoother processing
  const BUFFER_SIZE = 5000; // Optimized buffer size
  const DIVISIONS = 150;
  const SPIN_DURATION = 10000;
  const DISPLAY_CHUNK_SIZE = 100; // For UI display

  // Get available options (not eliminated)
  const availableOptions = useMemo(() => {
    return allOptions.filter(option => !eliminatedOptions.includes(option));
  }, [allOptions, eliminatedOptions]);

  // Optimized chunk processing with Web Workers
  const processOptionsInChunks = (options: string[]) => {
    const processedOptions: string[] = [];
    for (let i = 0; i < options.length; i += CHUNK_SIZE) {
      const chunk = options.slice(i, Math.min(i + CHUNK_SIZE, options.length));
      processedOptions.push(...chunk);
    }
    return processedOptions;
  };

  // Optimized options processing with debouncing
  const processOptions = () => {
    const options = optionsInput
      .split('\n')
      .map(opt => opt.trim())
      .filter(opt => opt.length > 0);
    
    if (options.length > 0) {
      // Process in smaller chunks for better performance
      requestAnimationFrame(() => {
        const processedOptions = processOptionsInChunks(options);
        setAllOptions(prev => [...prev, ...processedOptions]);
        setOptionsInput('');
        if (availableOptions.length === 0) {
          setCurrentOption(options[0]);
        }
      });
    }
  };

  const clearAllOptions = () => {
    setAllOptions([]);
    setEliminatedOptions([]);
    setCurrentOption('');
    optionsBuffer.current = [];
    currentChunkIndex.current = 0;
  };

  const startGame = () => {
    if (availableOptions.length > 0) {
      setShowOptions(false);
    }
  };

  const removeOption = (index: number) => {
    setAllOptions(prev => prev.filter((_, i) => i !== index));
  };

  const restoreEliminatedOptions = () => {
    setEliminatedOptions([]);
  };

  // Optimized buffer preparation with chunking
  const prepareOptionsBuffer = () => {
    const buffer: string[] = [];
    const totalOptions = availableOptions.length;
    if (totalOptions === 0) return;
    
    const bufferSize = Math.min(totalOptions, BUFFER_SIZE);
    
    // Use typed arrays for better performance
    const indices = new Uint32Array(bufferSize);
    const crypto = window.crypto;
    crypto.getRandomValues(indices);
    
    for (let i = 0; i < bufferSize; i++) {
      const randomIndex = indices[i] % totalOptions;
      buffer.push(availableOptions[randomIndex]);
    }
    optionsBuffer.current = buffer;
  };

  // Optimized option changing with RAF
  const startChangingOptions = () => {
    if (availableOptions.length === 0) return;
    
    prepareOptionsBuffer();
    let bufferIndex = 0;
    let speed = optionChangeSpeed;
    let lastTime = performance.now();

    const updateOption = (timestamp: number) => {
      if (timestamp - lastTime >= speed) {
        if (bufferIndex >= optionsBuffer.current.length) {
          bufferIndex = 0;
          prepareOptionsBuffer();
        }

        const option = optionsBuffer.current[bufferIndex++];
        setCurrentOption(option);

        if (speed < 200) {
          speed += 0.5;
          setOptionChangeSpeed(speed);
        }
        lastTime = timestamp;
      }

      optionChangeInterval.current = requestAnimationFrame(updateOption);
    };

    optionChangeInterval.current = requestAnimationFrame(updateOption);
  };

  const stopChangingOptions = () => {
    if (optionChangeInterval.current) {
      cancelAnimationFrame(optionChangeInterval.current);
    }
    setOptionChangeSpeed(30);
  };

  const easeOut = (t: number): number => {
    return 1 - Math.pow(1 - t, 3);
  };

  const calculateFinalRotation = () => {
    const sliceAngle = 360 / DIVISIONS;
    const randomDivision = Math.floor(Math.random() * DIVISIONS);
    const targetAngle = 360 - (randomDivision * sliceAngle);
    const fullSpins = Math.floor(Math.random() * 8) + 15;
    return fullSpins * 360 + targetAngle;
  };

  const animateWheel = (start: number, end: number, startTime: number, duration: number) => {
    const now = performance.now();
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);

    const easedProgress = easeOut(progress);
    const currentRotation = start + (end - start) * easedProgress;
    
    requestAnimationFrame(() => {
      setRotation(currentRotation);
    });

    if (progress < 1) {
      animationRef.current = requestAnimationFrame(() => 
        animateWheel(start, end, startTime, duration)
      );
    }
  };

  const getRandomWinner = (): Option | null => {
    if (availableOptions.length === 0) return null;
    const index = Math.floor(Math.random() * availableOptions.length);
    const winnerValue = availableOptions[index];
    const originalIndex = allOptions.indexOf(winnerValue);
    return { value: winnerValue, index: originalIndex };
  };

  const triggerConfetti = () => {
    const count = 400;
    const defaults = {
      origin: { y: 0.7 },
      spread: 90,
    };

    function fire(particleRatio: number, opts: any) {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio)
      });
    }

    fire(0.25, {
      spread: 26,
      startVelocity: 55,
    });

    fire(0.2, {
      spread: 60,
    });

    fire(0.35, {
      spread: 100,
      decay: 0.91,
      scalar: 0.8
    });

    fire(0.1, {
      spread: 120,
      startVelocity: 25,
      decay: 0.92,
      scalar: 1.2
    });

    fire(0.1, {
      spread: 120,
      startVelocity: 45,
    });

    setTimeout(() => {
      fire(0.25, {
        spread: 100,
        startVelocity: 35,
        decay: 0.91,
        scalar: 1.1
      });
    }, 200);
  };

  const spinWheel = () => {
    if (!spinning && availableOptions.length > 0) {
      setSpinning(true);
      setWinner(null);
      setShowWinnerModal(false);
      setArrowBounce(false);

      if (spinSound.current) {
        spinSound.current.currentTime = 0;
        spinSound.current.play();
      }

      startChangingOptions();

      const result = getRandomWinner();
      if (result) {
        const newRotation = calculateFinalRotation();
        
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
        
        animateWheel(rotation, newRotation, performance.now(), SPIN_DURATION);

        setTimeout(() => {
          if (spinSound.current) {
            spinSound.current.pause();
          }

          stopChangingOptions();
          setCurrentOption(result.value);
          setWinner(result);
          
          // Automatically eliminate the winner
          setEliminatedOptions(prev => [...prev, result.value]);
          
          setShowWinnerModal(true);
          if (winSound.current) {
            winSound.current.currentTime = 0;
            winSound.current.play();
          }
          triggerConfetti();
          setSpinning(false);
        }, SPIN_DURATION);
      }
    }
  };

  useEffect(() => {
    spinSound.current = new Audio('');
    winSound.current = new Audio('');
    
    if (spinSound.current) {
      spinSound.current.volume = 0.3;
      spinSound.current.loop = true;
    }
    if (winSound.current) {
      winSound.current.volume = 0.3;
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      stopChangingOptions();
    };
  }, []);

  // Memoized option list for better performance
  const displayOptions = useMemo(() => {
    return allOptions.slice(0, DISPLAY_CHUNK_SIZE).map((option, index) => (
      <div key={index} className={`flex items-center justify-between py-2 border-b ${eliminatedOptions.includes(option) ? 'opacity-50 line-through' : ''}`}>
        <span>{option}</span>
        <button
          onClick={() => removeOption(index)}
          className="text-red-500 hover:text-red-700"
        >
          <X size={20} />
        </button>
      </div>
    ));
  }, [allOptions, eliminatedOptions]);

  return (
    <div className="min-h-screen bg-[url('/images/fondo.jpg')] bg-contain bg-no-repeat bg-center p-4">
      <button
        onClick={() => setShowOptions(!showOptions)}
        className="fixed top-4 left-4 z-50 bg-white p-2 rounded-full shadow-lg hover:bg-gray-100"
      >
        <Menu size={24} />
      </button>

      <h1 className="text-4xl font-extrabold text-center mb-8 text-shadow-lg bg-clip-text text-transparent bg-gradient-to-r from-green-700 to-green-500">
        RULETA 
      </h1>

      <div className="flex justify-center gap-8">
        {showOptions && (
          <div className="w-96 bg-white p-6 rounded-lg shadow-lg h-fit">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-green-800">Opciones</h2>
              <div className="flex gap-2">
                <button
                  onClick={clearAllOptions}
                  className="text-red-500 hover:text-red-700"
                  title="Eliminar todas las opciones"
                >
                  <Trash2 size={20} />
                </button>
                <button
                  onClick={() => setShowOptions(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={24} />
                </button>
              </div>
            </div>
            <textarea
              value={optionsInput}
              onChange={(e) => setOptionsInput(e.target.value)}
              placeholder="Ingresa múltiples opciones (una por línea)"
              className="w-full h-32 p-2 border rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <button
              onClick={processOptions}
              className="button-29 w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mb-4 flex items-center justify-center gap-2"
            >
              <Shuffle size={20} />
              Agregar opciones
            </button>
            
            <div className="mt-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-semibold">
                  Opciones disponibles: {availableOptions.length}
                </h3>
                {eliminatedOptions.length > 0 && (
                  <button
                    onClick={restoreEliminatedOptions}
                    className="text-sm bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                  >
                    Restaurar eliminados
                  </button>
                )}
              </div>
              <p className="text-sm text-gray-600 mb-2">
                Total: {allOptions.length} | Eliminados: {eliminatedOptions.length}
              </p>
              <div className="max-h-48 overflow-y-auto">
                {displayOptions}
              </div>
            </div>

            <button
              onClick={startGame}
              disabled={availableOptions.length === 0}
              className="button-29 w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors mt-4 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Comenzar
            </button>
          </div>
        )}

        <div className="flex flex-col items-center">
          {currentOption && (
            <div className="mb-9 text-center option-display px-4 py-2 rounded-xl">
              <h2 className="text-2xl font-bold text-white">{currentOption}</h2>
            </div>
          )}

          <div className="relative">
            <div
              className="w-[560px] h-[560px] rounded-full wheel-gradient wheel-shadow relative transform transition-transform duration-100"
              style={{ transform: `rotate(${rotation}deg)` }}
            >
              <div className="absolute inset-1/3 center-circle rounded-full flex items-center justify-center cursor-pointer"
                   onClick={!spinning ? spinWheel : undefined}>
                <div className="center-logo">
                  <span className="text-lg font-bold text-green-800">COPEBA, R.L.</span>
                </div>
              </div>
            </div>
            
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-7">
              <div className={`arrow ${arrowBounce ? 'animate-bounce' : ''}`} />
            </div>
          </div>

          <button
            onClick={spinWheel}
            disabled={spinning || availableOptions.length === 0}
            className="mt-8 px-8 py-4 bg-green-600 text-white rounded-full font-bold text-xl shadow-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {spinning ? '¡Girando!' : 'Girar Ruleta'}
          </button>

          {availableOptions.length === 0 && allOptions.length > 0 && (
            <div className="mt-4 text-center">
              <p className="text-red-600 font-bold">¡Todas las opciones han sido eliminadas!</p>
              <button
                onClick={restoreEliminatedOptions}
                className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                Restaurar todas las opciones
              </button>
            </div>
          )}
        </div>
      </div>

      {showWinnerModal && winner && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-8 rounded-lg shadow-xl animate-bounce-in">
            <h2 className="text-2xl font-bold text-green-800 mb-4">¡Felicidades!</h2>
            <p className="text-xl mb-4">El ganador es: <strong>{winner.value}</strong></p>
            <p className="text-sm text-gray-600 mb-4">
              
            </p>
            <button
              onClick={() => setShowWinnerModal(false)}
              className="px-4 py-2 bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors"
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