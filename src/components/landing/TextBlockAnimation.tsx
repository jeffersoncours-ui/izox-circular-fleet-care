"use client"

import gsap from "gsap"
import { SplitText } from "gsap/SplitText"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { useGSAP } from "@gsap/react"
import { useRef, ReactNode, useEffect, useState } from "react"
import { useTweaks } from "./useTweaks"
import { cn } from "@/lib/utils"

if (typeof window !== "undefined") {
    gsap.registerPlugin(SplitText, ScrollTrigger)
}

interface TextBlockAnimationProps {
    children: ReactNode
    animateOnScroll?: boolean
    delay?: number
    useAccentColor?: boolean
    stagger?: number
    duration?: number
    className?: string
}

export default function TextBlockAnimation({
    children,
    animateOnScroll = true,
    delay = 0,
    useAccentColor = true,
    stagger = 0.05,
    duration = 0.5,
    className
}: TextBlockAnimationProps) {
    const { tweaks } = useTweaks()
    const containerRef = useRef<HTMLDivElement>(null)
    const [blockColor, setBlockColor] = useState(tweaks.accent)

    // Mettre à jour la couleur du bloc quand l'accent change
    useEffect(() => {
        setBlockColor(useAccentColor ? tweaks.accent : "var(--b2c-bg)")
    }, [tweaks.accent, useAccentColor])

    useGSAP(() => {
        if (!containerRef.current) return

        let split: SplitText | null = null
        let lines: HTMLElement[] = []
        let overlays: HTMLElement[] = []
        let resizeObserver: ResizeObserver | null = null

        try {
            // 1. Setup SplitText
            split = new SplitText(containerRef.current, { type: "lines" })
            lines = split.lines as HTMLElement[]

            // 2. Créer les overlays en JS (pas via Tailwind)
            lines.forEach((line) => {
                const overlay = document.createElement("span")
                overlay.style.cssText = `
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: ${blockColor};
                    transform-origin: left center;
                    transform: scaleX(0);
                    z-index: 10;
                    pointer-events: none;
                `
                line.style.position = "relative"
                line.style.display = "inline-block"
                line.style.overflow = "hidden"
                line.appendChild(overlay)
                overlays.push(overlay)
            })

            // 3. État initial
            gsap.set(lines, { opacity: 0 })

            // 4. Master Timeline
            const tl = gsap.timeline({
                defaults: { ease: "expo.inOut" },
                scrollTrigger: animateOnScroll
                    ? {
                        trigger: containerRef.current,
                        start: "top 85%",
                        toggleActions: "play none none reverse",
                    }
                    : undefined,
                delay: delay,
            })

            // 5. Animation : bloc révèle le texte
            overlays.forEach((overlay, idx) => {
                tl.to(
                    overlay,
                    {
                        scaleX: 1,
                        duration: duration,
                    },
                    delay + idx * stagger
                )
                    .set(lines[idx], { opacity: 1 }, "<")
                    .to(
                        overlay,
                        {
                            transformOrigin: "right center",
                            scaleX: 0,
                            duration: duration,
                        },
                        `<${duration * 0.7}`
                    )
            })

            // 6. ResizeObserver : recalculer les lignes si viewport change
            resizeObserver = new ResizeObserver(() => {
                if (split) {
                    split.revert()
                    overlays.forEach((o) => o.remove())
                    overlays = []

                    // Re-split et re-créer overlays
                    split = new SplitText(containerRef.current!, { type: "lines" })
                    lines = split.lines as HTMLElement[]

                    lines.forEach((line) => {
                        const overlay = document.createElement("span")
                        overlay.style.cssText = `
                            position: absolute;
                            top: 0;
                            left: 0;
                            right: 0;
                            bottom: 0;
                            background-color: ${blockColor};
                            transform-origin: left center;
                            transform: scaleX(0);
                            z-index: 10;
                            pointer-events: none;
                        `
                        line.style.position = "relative"
                        line.style.display = "inline-block"
                        line.style.overflow = "hidden"
                        line.appendChild(overlay)
                        overlays.push(overlay)
                    })

                    gsap.set(lines, { opacity: 0 })
                    if (tl) tl.restart()
                }
            })
            resizeObserver.observe(containerRef.current)

            // 7. Cleanup
            return () => {
                if (split) split.revert()
                if (resizeObserver) resizeObserver.disconnect()
                overlays.forEach((o) => o.remove())
                tl.kill()
            }
        } catch (error) {
            console.warn("[TextBlockAnimation] Error:", error)
            return () => {}
        }
    }, {
        scope: containerRef,
        dependencies: [blockColor, animateOnScroll, delay, stagger, duration],
    })

    return (
        <div ref={containerRef} className={cn("relative", className)}>
            {children}
        </div>
    )
}
