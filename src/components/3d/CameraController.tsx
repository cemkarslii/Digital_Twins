import React, { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { useFactoryStore } from '../../store/useFactoryStore';
import { CAMPUS_CAMERA_TARGET } from '../../data/cameraPresets';

export const CameraController: React.FC = () => {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const { camera } = useThree();

  const cameraTransitionTarget = useFactoryStore((s) => s.cameraTransitionTarget);
  const clearCameraTransition = useFactoryStore((s) => s.clearCameraTransition);
  const cancelCameraTransition = useFactoryStore((s) => s.cancelCameraTransition);
  const setViewPreset = useFactoryStore((s) => s.setViewPreset);
  useEffect(() => { setViewPreset('isometric'); }, [setViewPreset]);

  // Transition animation state
  const isTransitioningRef = useRef(false);
  const targetCamPos = useRef(new THREE.Vector3());
  const targetLookAt = useRef(new THREE.Vector3());

  // Whenever cameraTransitionTarget is updated, activate transition
  useEffect(() => {
    if (cameraTransitionTarget) {
      targetCamPos.current.set(...cameraTransitionTarget.position);
      targetLookAt.current.set(...cameraTransitionTarget.lookAt);
      isTransitioningRef.current = true;
    }
  }, [cameraTransitionTarget]);

  // When user interacts directly with mouse, cancel any active animation immediately
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    const handleStart = () => {
      if (isTransitioningRef.current) {
        isTransitioningRef.current = false;
      }
      cancelCameraTransition();
    };

    controls.addEventListener('start', handleStart);
    return () => {
      controls.removeEventListener('start', handleStart);
    };
  }, [cancelCameraTransition]);

  // Frame tick: smoothly interpolate camera position & controls target ONLY during programmatic transition
  useFrame((_, delta) => {
    const controls = controlsRef.current;
    if (!controls) return;

    if (isTransitioningRef.current) {
      const step = Math.min(delta * 5.5, 1.0);
      camera.position.lerp(targetCamPos.current, step);
      controls.target.lerp(targetLookAt.current, step);
      controls.update();

      const distCam = camera.position.distanceTo(targetCamPos.current);
      const distTarget = controls.target.distanceTo(targetLookAt.current);

      if (distCam < 0.25 && distTarget < 0.25) {
        camera.position.copy(targetCamPos.current);
        controls.target.copy(targetLookAt.current);
        isTransitioningRef.current = false;
        clearCameraTransition();
      }
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      target={CAMPUS_CAMERA_TARGET}
      enableDamping
      dampingFactor={0.08}
      rotateSpeed={0.85}
      panSpeed={0.9}
      zoomSpeed={1.05}
      minDistance={4}
      maxDistance={1500}
      minPolarAngle={0.0001}
      maxPolarAngle={Math.PI / 2 - 0.02} // Ground-level facade & loading dock inspection
      screenSpacePanning
      mouseButtons={{
        LEFT: THREE.MOUSE.ROTATE,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.PAN
      }}
    />
  );
};
