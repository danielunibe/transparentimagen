import { TransparentPreviewBackground } from '@/types/asteria';

interface TransparentCanvasBackgroundProps {
    mode: TransparentPreviewBackground;
}

export function TransparentCanvasBackground({ mode }: TransparentCanvasBackgroundProps) {
    const className = mode === 'checkerboard'
        ? 'bg-[linear-gradient(45deg,#c9c9c9_25%,transparent_25%,transparent_75%,#c9c9c9_75%,#c9c9c9),linear-gradient(45deg,#c9c9c9_25%,transparent_25%,transparent_75%,#c9c9c9_75%,#c9c9c9)] bg-[length:24px_24px] bg-[position:0_0,12px_12px] bg-white'
        : mode === 'white'
            ? 'bg-white'
            : mode === 'black'
                ? 'bg-black'
                : 'bg-[#111313]';

    return <div className={`absolute inset-0 z-0 transition-colors duration-300 ${className}`} />;
}
