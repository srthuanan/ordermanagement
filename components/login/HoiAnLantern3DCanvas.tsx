import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

interface HoiAnLantern3DCanvasProps {
    className?: string;
    width?: number;
    height?: number;
}

export const HoiAnLantern3DCanvas: React.FC<HoiAnLantern3DCanvasProps> = ({
    className = 'w-32 h-48 sm:w-40 sm:h-56',
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [_isLoading, setIsLoading] = useState(true);
    const [isHovered, setIsHovered] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    // Refs for animation & interaction state
    const interactionRef = useRef({
        isPointerDown: false,
        prevPointerX: 0,
        prevPointerY: 0,
        userRotationY: 0,
        userRotationX: 0,
        targetRotationY: 0,
        targetRotationX: 0,
        velocity: 0,
        lastInteractionTime: 0,
    });

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const width = container.clientWidth || 160;
        const height = container.clientHeight || 240;

        // 1. Scene setup
        const scene = new THREE.Scene();

        // 2. Camera setup
        const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
        camera.position.set(0, -0.4, 4.8);

        // 3. Renderer setup
        const renderer = new THREE.WebGLRenderer({
            alpha: true,
            antialias: true,
            powerPreference: 'high-performance',
        });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.1;
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        container.appendChild(renderer.domElement);

        // 4. Lighting
        const ambientLight = new THREE.AmbientLight(0xfff3d6, 1.2);
        scene.add(ambientLight);

        const keyLight = new THREE.DirectionalLight(0xffe8ba, 2.5);
        keyLight.position.set(3, 4, 4);
        scene.add(keyLight);

        const fillLight = new THREE.DirectionalLight(0xffffff, 1.5);
        fillLight.position.set(-3, -1, 3);
        scene.add(fillLight);

        const rimLight = new THREE.PointLight(0xf59e0b, 3.0, 10);
        rimLight.position.set(0, 2, -2);
        scene.add(rimLight);

        // Pivot group for physics pendulum sway around top hook
        const pivotGroup = new THREE.Group();
        pivotGroup.position.set(0, 0.9, 0); // Hook position
        scene.add(pivotGroup);

        const lanternModelGroup = new THREE.Group();
        lanternModelGroup.position.set(0, -0.9, 0); // Offset down from hook
        pivotGroup.add(lanternModelGroup);

        // 5. Texture & Materials Loader
        const textureLoader = new THREE.TextureLoader();
        const embroideryTexture = textureLoader.load(
            `${import.meta.env.BASE_URL}assets/lantern_embroidery.png`
        );
        embroideryTexture.wrapS = THREE.RepeatWrapping;
        embroideryTexture.wrapT = THREE.ClampToEdgeWrapping;
        embroideryTexture.colorSpace = THREE.SRGBColorSpace;

        const loader = new GLTFLoader();
        const modelUrl = `${import.meta.env.BASE_URL}models/hoi_an_lantern.glb`;

        let isMounted = true;
        let loadedScene: THREE.Group | null = null;

        loader.load(
            modelUrl,
            (gltf) => {
                if (!isMounted) return;
                loadedScene = gltf.scene;

                // Adjust materials for rich silk luminescence
                loadedScene.traverse((child) => {
                    if ((child as THREE.Mesh).isMesh) {
                        const mesh = child as THREE.Mesh;
                        const name = mesh.name || '';

                        if (name.includes('Body')) {
                            // Silk Canopy with floral embroidery texture
                            mesh.material = new THREE.MeshStandardMaterial({
                                map: embroideryTexture,
                                color: 0xffffff,
                                roughness: 0.35,
                                metalness: 0.05,
                                emissive: new THREE.Color(0xd97706),
                                emissiveIntensity: 0.25,
                            });
                        } else if (name.includes('Bamboo')) {
                            // Gold Bamboo Ribs
                            mesh.material = new THREE.MeshStandardMaterial({
                                color: 0xf59e0b,
                                metalness: 0.88,
                                roughness: 0.22,
                            });
                        } else if (name.includes('Collar') || name.includes('Tier')) {
                            // Dark Mahogany Wood Collars
                            mesh.material = new THREE.MeshStandardMaterial({
                                color: 0x270d06,
                                roughness: 0.32,
                            });
                        } else if (name.includes('Hanger') || name.includes('Ring') || name.includes('Bead') || name.includes('Cap')) {
                            // Brass & Gold Accents
                            mesh.material = new THREE.MeshStandardMaterial({
                                color: 0xfbbf24,
                                metalness: 0.95,
                                roughness: 0.18,
                            });
                        } else if (name.includes('Strand') || name.includes('Knot')) {
                            // Rich Crimson Silk Tassel Threads
                            mesh.material = new THREE.MeshStandardMaterial({
                                color: 0xdc2626,
                                roughness: 0.45,
                            });
                        }
                    }
                });

                // Center & scale model comfortably in viewport
                const bbox = new THREE.Box3().setFromObject(loadedScene);
                const size = new THREE.Vector3();
                bbox.getSize(size);
                const maxDim = Math.max(size.x, size.y, size.z);
                const targetHeight = 3.2;
                const scale = targetHeight / maxDim;
                loadedScene.scale.setScalar(scale);

                lanternModelGroup.add(loadedScene);
                setIsLoading(false);
            },
            undefined,
            (err) => {
                console.warn('Could not load 3D lantern model, falling back to static render:', err);
                setIsLoading(false);
            }
        );

        // 6. Animation loop
        let animationFrameId: number;
        let clock = new THREE.Clock();

        const animate = () => {
            animationFrameId = requestAnimationFrame(animate);
            const elapsed = clock.getElapsedTime();
            const state = interactionRef.current;

            // Physics pendulum gentle sway (con lắc đung đưa trong gió)
            const swayZ = Math.sin(elapsed * 1.6) * 0.065;
            const swayX = Math.cos(elapsed * 1.2) * 0.035;
            pivotGroup.rotation.z = swayZ + state.targetRotationX * 0.2;
            pivotGroup.rotation.x = swayX;

            // User interactive rotation vs idle slow spin
            const now = performance.now();
            const timeSinceInteraction = now - state.lastInteractionTime;

            if (!state.isPointerDown) {
                if (timeSinceInteraction > 2500) {
                    // Idle gentle 360 rotation
                    state.targetRotationY += 0.008;
                }
            }

            // Smooth damping
            lanternModelGroup.rotation.y += (state.targetRotationY - lanternModelGroup.rotation.y) * 0.08;

            renderer.render(scene, camera);
        };

        animate();

        // 7. Pointer Event Handlers for 360 Drag
        const onPointerDown = (e: PointerEvent) => {
            const state = interactionRef.current;
            state.isPointerDown = true;
            state.prevPointerX = e.clientX;
            state.prevPointerY = e.clientY;
            state.lastInteractionTime = performance.now();
            setIsDragging(true);
            container.setPointerCapture?.(e.pointerId);
        };

        const onPointerMove = (e: PointerEvent) => {
            const state = interactionRef.current;
            if (!state.isPointerDown) return;

            const deltaX = e.clientX - state.prevPointerX;
            const deltaY = e.clientY - state.prevPointerY;
            state.prevPointerX = e.clientX;
            state.prevPointerY = e.clientY;
            state.lastInteractionTime = performance.now();

            state.targetRotationY += deltaX * 0.015;
            state.targetRotationX = Math.max(-0.4, Math.min(0.4, state.targetRotationX + deltaY * 0.008));
        };

        const onPointerUp = (e: PointerEvent) => {
            const state = interactionRef.current;
            state.isPointerDown = false;
            state.targetRotationX = 0;
            state.lastInteractionTime = performance.now();
            setIsDragging(false);
            container.releasePointerCapture?.(e.pointerId);
        };

        container.addEventListener('pointerdown', onPointerDown);
        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);

        // 8. Resize Observer
        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const w = entry.contentRect.width;
                const h = entry.contentRect.height;
                if (w > 0 && h > 0) {
                    camera.aspect = w / h;
                    camera.updateProjectionMatrix();
                    renderer.setSize(w, h);
                }
            }
        });
        resizeObserver.observe(container);

        // 9. Cleanup
        return () => {
            isMounted = false;
            cancelAnimationFrame(animationFrameId);
            container.removeEventListener('pointerdown', onPointerDown);
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
            resizeObserver.disconnect();

            if (container.contains(renderer.domElement)) {
                container.removeChild(renderer.domElement);
            }
            renderer.dispose();
            scene.clear();
        };
    }, []);

    return (
        <div
            className={`relative flex flex-col items-center justify-center select-none ${className}`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Dây treo chỉ vàng kim cố định */}
            <div className="w-[2px] h-7 sm:h-9 bg-gradient-to-b from-amber-200 via-amber-400 to-amber-600 shadow-[0_0_8px_rgba(245,158,11,0.85)] z-10" />

            {/* Khung chứa WebGL 3D Canvas */}
            <div
                ref={containerRef}
                className={`w-full h-full cursor-grab active:cursor-grabbing touch-none transition-transform duration-200 ${
                    isDragging ? 'scale-105' : 'hover:scale-102'
                }`}
                title="Lồng đèn 3D Hội An: Nhấp giữ chuột hoặc vuốt để xoay 360°"
            />

            {/* Hiệu ứng hào quang vàng đỏ lung linh phía sau */}
            <div className="absolute inset-0 -z-10 rounded-full bg-gradient-radial from-amber-500/25 via-red-600/15 to-transparent blur-xl pointer-events-none animate-pulse" />

            {/* Tooltip hướng dẫn tương tác xuất hiện khi rê chuột */}
            <div
                className={`absolute -bottom-7 whitespace-nowrap px-2.5 py-1 rounded-full bg-slate-950/85 border border-amber-400/40 text-[10px] text-amber-200 font-medium shadow-[0_4px_12px_rgba(0,0,0,0.8)] pointer-events-none transition-all duration-300 z-40 ${
                    isHovered || isDragging
                        ? 'opacity-100 translate-y-0 scale-100'
                        : 'opacity-0 translate-y-1 scale-95'
                }`}
            >
                🏮 <span className="font-bold text-amber-300">Xoay 360°</span> bằng chuột/chạm
            </div>
        </div>
    );
};
