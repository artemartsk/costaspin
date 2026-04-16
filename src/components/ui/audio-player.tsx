import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';

export function AudioPlayer({ src }: { src: string }) {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);

    // Fake waveform heights for visual effect
    const [waveform] = useState(() => 
        Array.from({ length: 24 }, () => Math.round(Math.random() * 60 + 20))
    );

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const setAudioData = () => {
            setDuration(audio.duration);
        };

        const setAudioTime = () => {
            setCurrentTime(audio.currentTime);
        };

        const handleEnded = () => {
            setIsPlaying(false);
            setCurrentTime(0);
        };

        audio.addEventListener('loadedmetadata', setAudioData);
        audio.addEventListener('timeupdate', setAudioTime);
        audio.addEventListener('ended', handleEnded);

        // Fetch duration immediately if already loaded
        if (audio.readyState > 0) {
            setAudioData();
        }

        return () => {
            audio.removeEventListener('loadedmetadata', setAudioData);
            audio.removeEventListener('timeupdate', setAudioTime);
            audio.removeEventListener('ended', handleEnded);
        };
    }, []);

    const togglePlayPause = () => {
        const audio = audioRef.current;
        if (!audio) return;

        if (isPlaying) {
            audio.pause();
        } else {
            audio.play();
        }
        setIsPlaying(!isPlaying);
    };

    const formatTime = (time: number) => {
        if (isNaN(time)) return '0:00';
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
        <div className="flex items-center gap-3 bg-slate-100 dark:bg-slate-800/80 rounded-lg px-3 py-2 mt-2 w-full border border-border/50">
            <audio ref={audioRef} src={src} preload="metadata" />
            
            <button 
                onClick={togglePlayPause}
                className="flex items-center justify-center p-1 rounded-full bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors shadow-sm shrink-0"
            >
                {isPlaying ? (
                    <Pause className="w-3.5 h-3.5 text-slate-700 dark:text-slate-200" />
                ) : (
                    <Play className="w-3.5 h-3.5 text-slate-700 dark:text-slate-200 ml-0.5" />
                )}
            </button>

            <div className="flex items-center gap-[2px] flex-1">
                {waveform.map((height, i) => {
                    const barProgress = (i / waveform.length) * 100;
                    const isActive = progressPercentage > barProgress;
                    return (
                        <div 
                            key={i} 
                            className={`w-0.5 rounded-full transition-colors duration-200 ${
                                isActive ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-600'
                            }`}
                            style={{ height: `${height}%`, maxHeight: '16px', minHeight: '4px' }}
                        />
                    );
                })}
            </div>

            <div className="text-[10px] font-mono text-muted-foreground shrink-0 tabular-nums">
                {formatTime(currentTime)} / {formatTime(duration)}
            </div>
        </div>
    );
}
