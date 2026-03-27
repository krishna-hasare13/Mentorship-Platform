'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
// @ts-ignore
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
// @ts-ignore
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
// @ts-ignore
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';
import { motion } from 'framer-motion';
import Link from 'next/link';

gsap.registerPlugin(ScrollTrigger);

export const CosmosHero = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const titleRef = useRef<HTMLHeadingElement>(null);
    const subtitleRef = useRef<HTMLDivElement>(null);
    const scrollProgressRef = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    const smoothCameraPos = useRef({ x: 0, y: 30, z: 100 });
    
    const [scrollProgress, setScrollProgress] = useState(0);
    const [currentSection, setCurrentSection] = useState(1);
    const [isReady, setIsReady] = useState(false);
    const totalSections = 2;
    
    const threeRefs = useRef<any>({
        scene: null,
        camera: null,
        renderer: null,
        composer: null,
        stars: [],
        nebula: null,
        mountains: [],
        animationId: null,
        locations: []
    });

    useEffect(() => {
        const refs = threeRefs.current;
        
        // Scene setup
        refs.scene = new THREE.Scene();
        refs.scene.fog = new THREE.FogExp2(0x000000, 0.00025);

        // Camera
        refs.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            2000
        );
        refs.camera.position.z = 100;
        refs.camera.position.y = 20;

        // Renderer
        refs.renderer = new THREE.WebGLRenderer({
            canvas: canvasRef.current!,
            antialias: true,
            alpha: true
        });
        refs.renderer.setSize(window.innerWidth, window.innerHeight);
        refs.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        refs.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        refs.renderer.toneMappingExposure = 0.5;

        // Post-processing
        refs.composer = new EffectComposer(refs.renderer);
        const renderPass = new RenderPass(refs.scene, refs.camera);
        refs.composer.addPass(renderPass);

        const bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            0.8,
            0.4,
            0.85
        );
        refs.composer.addPass(bloomPass);

        // Create scene helper functions
        const createStarField = () => {
            const starCount = 5000;
            for (let i = 0; i < 3; i++) {
                const geometry = new THREE.BufferGeometry();
                const positions = new Float32Array(starCount * 3);
                const colors = new Float32Array(starCount * 3);
                const sizes = new Float32Array(starCount);

                for (let j = 0; j < starCount; j++) {
                    const radius = 200 + Math.random() * 800;
                    const theta = Math.random() * Math.PI * 2;
                    const phi = Math.acos(Math.random() * 2 - 1);

                    positions[j * 3] = radius * Math.sin(phi) * Math.cos(theta);
                    positions[j * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
                    positions[j * 3 + 2] = radius * Math.cos(phi);

                    const color = new THREE.Color();
                    const choice = Math.random();
                    if (choice < 0.7) color.setHSL(0, 0, 0.8 + Math.random() * 0.2);
                    else if (choice < 0.9) color.setHSL(0.63, 0.6, 0.7); // Light blue
                    else color.setHSL(0.95, 0.6, 0.7); // Soft red
                    
                    colors[j * 3] = color.r;
                    colors[j * 3 + 1] = color.g;
                    colors[j * 3 + 2] = color.b;
                    sizes[j] = Math.random() * 2 + 0.5;
                }

                geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
                geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
                geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

                const material = new THREE.ShaderMaterial({
                    uniforms: { time: { value: 0 }, depth: { value: i } },
                    vertexShader: `
                        attribute float size;
                        attribute vec3 color;
                        varying vec3 vColor;
                        uniform float time;
                        uniform float depth;
                        void main() {
                            vColor = color;
                            vec3 pos = position;
                            float angle = time * 0.05 * (1.0 - depth * 0.3);
                            mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
                            pos.xy = rot * pos.xy;
                            vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                            gl_PointSize = size * (300.0 / -mvPosition.z);
                            gl_Position = projectionMatrix * mvPosition;
                        }
                    `,
                    fragmentShader: `
                        varying vec3 vColor;
                        void main() {
                            float dist = length(gl_PointCoord - vec2(0.5));
                            if (dist > 0.5) discard;
                            gl_FragColor = vec4(vColor, 1.0 - smoothstep(0.0, 0.5, dist));
                        }
                    `,
                    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false
                });

                const stars = new THREE.Points(geometry, material);
                refs.scene.add(stars);
                refs.stars.push(stars);
            }
        };

        const createNebula = () => {
            const geometry = new THREE.PlaneGeometry(8000, 4000, 100, 100);
            const material = new THREE.ShaderMaterial({
                uniforms: {
                    time: { value: 0 },
                    color1: { value: new THREE.Color(0xffffff) }, // white
                    color2: { value: new THREE.Color(0x2563eb) }, // blue
                    opacity: { value: 0.2 }
                },
                vertexShader: `
                    varying vec2 vUv;
                    uniform float time;
                    void main() {
                        vUv = uv;
                        vec3 pos = position;
                        pos.z += sin(pos.x * 0.01 + time) * cos(pos.y * 0.01 + time) * 20.0;
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                    }
                `,
                fragmentShader: `
                    uniform vec3 color1;
                    uniform vec3 color2;
                    uniform float opacity;
                    uniform float time;
                    varying vec2 vUv;
                    void main() {
                        float mixFactor = sin(vUv.x * 10.0 + time) * cos(vUv.y * 10.0 + time);
                        vec3 color = mix(color1, color2, mixFactor * 0.5 + 0.5);
                        float alpha = opacity * (1.0 - length(vUv - 0.5) * 2.0);
                        gl_FragColor = vec4(color, alpha);
                    }
                `,
                transparent: true, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false
            });
            refs.nebula = new THREE.Mesh(geometry, material);
            refs.nebula.position.z = -1050;
            refs.scene.add(refs.nebula);
        };

        const createMountains = () => {
            const layers = [
                { z: -50, h: 60, col: 0x0a0a0a, opt: 1 },
                { z: -100, h: 80, col: 0x171717, opt: 0.8 },
                { z: -150, h: 100, col: 0x262626, opt: 0.6 },
                { z: -200, h: 120, col: 0x404040, opt: 0.4 }
            ];

            layers.forEach((layer, i) => {
                const points = [];
                const segments = 50;
                for (let j = 0; j <= segments; j++) {
                    const x = (j / segments - 0.5) * 2000;
                    const y = Math.sin(j * 0.1) * layer.h + Math.sin(j * 0.05) * layer.h * 0.5 + Math.random() * 10 - 100;
                    points.push(new THREE.Vector2(x, y));
                }
                points.push(new THREE.Vector2(1000, -500), new THREE.Vector2(-1000, -500));
                
                const shape = new THREE.Shape(points);
                const mountain = new THREE.Mesh(
                    new THREE.ShapeGeometry(shape),
                    new THREE.MeshBasicMaterial({ color: layer.col, transparent: true, opacity: layer.opt })
                );
                mountain.position.z = layer.z;
                mountain.userData = { baseZ: layer.z, index: i };
                refs.scene.add(mountain);
                refs.mountains.push(mountain);
                refs.locations.push(layer.z);
            });
        };

        const animate = () => {
            refs.animationId = requestAnimationFrame(animate);
            const time = Date.now() * 0.001;

            refs.stars.forEach((sf: any) => sf.material.uniforms.time.value = time);
            if (refs.nebula) refs.nebula.material.uniforms.time.value = time * 0.5;

            if (refs.camera && refs.targetCameraZ !== undefined) {
                smoothCameraPos.current.x += (refs.targetCameraX - smoothCameraPos.current.x) * 0.05;
                smoothCameraPos.current.y += (refs.targetCameraY - smoothCameraPos.current.y) * 0.05;
                smoothCameraPos.current.z += (refs.targetCameraZ - smoothCameraPos.current.z) * 0.05;
                
                refs.camera.position.x = smoothCameraPos.current.x + Math.sin(time * 0.1) * 2;
                refs.camera.position.y = smoothCameraPos.current.y + Math.cos(time * 0.15);
                refs.camera.position.z = smoothCameraPos.current.z;
                refs.camera.lookAt(0, 10, -600);
            }

            refs.composer.render();
        };

        createStarField();
        createNebula();
        createMountains();
        animate();
        setIsReady(true);

        const handleResize = () => {
            refs.camera.aspect = window.innerWidth / window.innerHeight;
            refs.camera.updateProjectionMatrix();
            refs.renderer.setSize(window.innerWidth, window.innerHeight);
            refs.composer.setSize(window.innerWidth, window.innerHeight);
        };
        window.addEventListener('resize', handleResize);

        return () => {
            cancelAnimationFrame(refs.animationId);
            window.removeEventListener('resize', handleResize);
            refs.renderer.dispose();
        };
    }, []);

    useEffect(() => {
        const handleScroll = () => {
            const progress = window.scrollY / (document.documentElement.scrollHeight - window.innerHeight);
            setScrollProgress(progress);
            
            const newSection = Math.floor(progress * totalSections);
            setCurrentSection(newSection);

            const refs = threeRefs.current;
            const camPositions = [
                { x: 0, y: 30, z: 150 },
                { x: 0, y: 40, z: -50 },
                { x: 0, y: 50, z: -700 }
            ];
            
            const totalProg = progress * totalSections;
            const secProg = totalProg % 1;
            const currentPos = camPositions[newSection] || camPositions[0];
            const nextPos = camPositions[newSection + 1] || currentPos;

            refs.targetCameraX = currentPos.x + (nextPos.x - currentPos.x) * secProg;
            refs.targetCameraY = currentPos.y + (nextPos.y - currentPos.y) * secProg;
            refs.targetCameraZ = currentPos.z + (nextPos.z - currentPos.z) * secProg;
        };

        window.addEventListener('scroll', handleScroll);
        handleScroll();
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <div ref={containerRef} className="relative w-full h-[300vh] bg-background overflow-x-hidden">
            <canvas ref={canvasRef} className="fixed top-0 left-0 w-full h-full pointer-events-none" />
            
            {/* Sections */}
            <section className="relative h-screen flex flex-col items-center justify-center text-center px-6">
                <motion.h1 initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} className="text-5xl md:text-9xl font-black tracking-tighter text-white mb-6 md:mb-8">
                    MENTORSPACE
                </motion.h1>
                <div className="max-w-sm md:max-w-xl text-lg md:text-xl text-white/50 leading-relaxed">
                    <p>Where learning meets elite mentorship,</p>
                    <p>we shape the developers of tomorrow.</p>
                </div>
                <Link href="/register" className="mt-8 md:mt-12 px-8 md:px-10 py-3 md:py-4 bg-primary text-black rounded-full font-bold text-base md:text-lg hover:shadow-[0_0_40px_rgba(255,255,255,0.4)] transition-all">
                    GET STARTED
                </Link>
            </section>

            <section className="relative h-screen flex flex-col items-center justify-center text-center px-6">
                <h1 className="text-5xl md:text-9xl font-black tracking-tighter text-white mb-6 md:mb-8 bg-clip-text text-transparent bg-gradient-to-b from-white to-white/20">
                    COLLABORATE
                </h1>
                <div className="max-w-sm md:max-w-xl text-lg md:text-xl text-white/50 leading-relaxed font-medium capitalize">
                   <p>Real-time video and code editing, </p>
                   <p>synced perfectly for your growth</p>
                </div>
            </section>

            <section className="relative h-screen flex flex-col items-center justify-center text-center px-6">
                <h1 className="text-5xl md:text-9xl font-black tracking-tighter text-white mb-6 md:mb-8 bg-clip-text text-transparent bg-gradient-to-b from-white to-primary">
                    EXCEL
                </h1>
                <div className="max-w-sm md:max-w-xl text-lg md:text-xl text-white/50 leading-relaxed italic">
                    <p>In the space between student and master, </p>
                    <p>lies the path to true expertise.</p>
                </div>
            </section>
        </div>
    );
};
