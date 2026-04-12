// @client-reason: Touch-based joystick for mobile eyebrow positioning
"use client";

import { useRef, useCallback, useState, useEffect } from "react";
import { Move } from "lucide-react";

const PAD_SIZE = 72;
const KNOB_SIZE = 28;
const MAX_DIST = (PAD_SIZE - KNOB_SIZE) / 2;

/** Sensitivity: canvas pixels per frame at max deflection */
const SPEED = 0.5;

interface JoystickProps {
    onMove: (dx: number, dy: number) => void;
    onStart: () => void;
    onEnd: () => void;
}

interface Vec2 { x: number; y: number }

function clampVec(clientX: number, clientY: number, rect: DOMRect): { nx: number; ny: number; px: number; py: number } {
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > MAX_DIST) {
        dx = (dx / dist) * MAX_DIST;
        dy = (dy / dist) * MAX_DIST;
    }
    return { nx: dx / MAX_DIST, ny: dy / MAX_DIST, px: dx, py: dy };
}

// ─── Subcomponents ──────────────────────────────────────────────────────────

function JoystickPad({ knobPos }: Readonly<{ knobPos: Vec2 }>): React.ReactElement {
    return (
        <>
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="absolute left-1.5 text-[8px] text-white/20" aria-hidden="true">L</div>
                <div className="absolute right-1.5 text-[8px] text-white/20" aria-hidden="true">R</div>
                <div className="absolute top-0.5 text-[8px] text-white/20" aria-hidden="true">U</div>
                <div className="absolute bottom-0.5 text-[8px] text-white/20" aria-hidden="true">D</div>
            </div>
            <div className="pointer-events-none absolute left-1/2 top-2 h-[calc(100%-16px)] w-px -translate-x-1/2 bg-white/10" />
            <div className="pointer-events-none absolute left-2 top-1/2 h-px w-[calc(100%-16px)] -translate-y-1/2 bg-white/10" />
            <div
                className="pointer-events-none absolute h-7 w-7 rounded-full bg-pink-500 shadow-lg transition-transform duration-75"
                style={{ transform: `translate(${knobPos.x}px, ${knobPos.y}px)` }}
            >
                <Move className="absolute left-1/2 top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 text-white" aria-hidden="true" />
            </div>
        </>
    );
}

// ─── Hook: pointer + rAF logic ──────────────────────────────────────────────

interface JoystickState {
    knobPos: Vec2;
    handlers: {
        onPointerDown: (e: React.PointerEvent) => void;
        onPointerMove: (e: React.PointerEvent) => void;
        onPointerUp: () => void;
    };
    padRef: React.RefObject<HTMLDivElement | null>;
}

function useJoystickPointer(onMove: (dx: number, dy: number) => void, onStart: () => void, onEnd: () => void): JoystickState {
    const padRef = useRef<HTMLDivElement>(null);
    const rafRef = useRef(0);
    const activeRef = useRef(false);
    const vecRef = useRef<Vec2>({ x: 0, y: 0 });
    const onMoveRef = useRef(onMove);
    const [knobPos, setKnobPos] = useState<Vec2>({ x: 0, y: 0 });

    useEffect(() => { onMoveRef.current = onMove; }, [onMove]);

    const startLoop = useCallback(() => {
        const loop = (): void => {
            if (!activeRef.current) return;
            const { x, y } = vecRef.current;
            if (Math.abs(x) > 0.01 || Math.abs(y) > 0.01) {
                onMoveRef.current(x * SPEED, y * SPEED);
            }
            rafRef.current = requestAnimationFrame(loop);
        };
        rafRef.current = requestAnimationFrame(loop);
    }, []);

    const onPointerDown = useCallback((e: React.PointerEvent) => {
        e.preventDefault();
        const pad = padRef.current;
        if (!pad) return;
        activeRef.current = true;
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        const { nx, ny, px, py } = clampVec(e.clientX, e.clientY, pad.getBoundingClientRect());
        vecRef.current = { x: nx, y: ny };
        setKnobPos({ x: px, y: py });
        onStart();
        startLoop();
    }, [onStart, startLoop]);

    const onPointerMove = useCallback((e: React.PointerEvent) => {
        if (!activeRef.current) return;
        const pad = padRef.current;
        if (!pad) return;
        const { nx, ny, px, py } = clampVec(e.clientX, e.clientY, pad.getBoundingClientRect());
        vecRef.current = { x: nx, y: ny };
        setKnobPos({ x: px, y: py });
    }, []);

    const onPointerUp = useCallback(() => {
        activeRef.current = false;
        cancelAnimationFrame(rafRef.current);
        vecRef.current = { x: 0, y: 0 };
        setKnobPos({ x: 0, y: 0 });
        onEnd();
    }, [onEnd]);

    return { knobPos, handlers: { onPointerDown, onPointerMove, onPointerUp }, padRef };
}

// ─── Component ──────────────────────────────────────────────────────────────

export function Joystick({ onMove, onStart, onEnd }: Readonly<JoystickProps>): React.ReactElement {
    const { knobPos, handlers, padRef } = useJoystickPointer(onMove, onStart, onEnd);

    return (
        <div
            ref={padRef}
            className="relative flex h-[72px] w-[72px] items-center justify-center rounded-full border-2 border-white/20 bg-white/5 backdrop-blur-sm touch-none"
            aria-label="눈썹 위치 조이스틱"
            onPointerDown={handlers.onPointerDown}
            onPointerMove={handlers.onPointerMove}
            onPointerUp={handlers.onPointerUp}
            onPointerCancel={handlers.onPointerUp}
        >
            <JoystickPad knobPos={knobPos} />
        </div>
    );
}
