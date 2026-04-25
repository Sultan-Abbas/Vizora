import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Cylinder, Sphere, useGLTF, Html, Box as BoxMesh } from '@react-three/drei';
import * as THREE from 'three';
import { useEditorStore } from '../store';

interface Scene3DProps {
  isPlaying: boolean;
  currentFrame: number;
  totalFrames: number;
}

function CustomModel({ id, url, position, isRigged }: { id: string, url: string, position: [number, number, number], isRigged: boolean }) {
  const { scene } = useGLTF(url);
  const { selectedPart, setSelectedPart, currentFrame, totalFrames, selectedModelId, setSelectedModelId, updateModelPosition, currentProject } = useEditorStore();
  const isSelected = selectedModelId === id;
  
  // motionData is already parsed in Editor.tsx
  const motionData = currentProject?.motionData;

  const bonesRef = useRef<Record<string, THREE.Object3D>>({});
  const baseRotationsRef = useRef<Record<string, THREE.Euler>>({});

  useEffect(() => {
    // Handle WASD keyboard movement when selected
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isSelected) return;
      const speed = 0.5;
      if (e.key.toLowerCase() === 'w') updateModelPosition(id, [0, 0, -speed]);
      if (e.key.toLowerCase() === 's') updateModelPosition(id, [0, 0, speed]);
      if (e.key.toLowerCase() === 'a') updateModelPosition(id, [-speed, 0, 0]);
      if (e.key.toLowerCase() === 'd') updateModelPosition(id, [speed, 0, 0]);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSelected, id, updateModelPosition]);

  useEffect(() => {
    if (isRigged && scene) {
      const mapped: Record<string, THREE.Object3D> = {};
      let hasBones = false;
      
      // Auto-detect bones based on common naming conventions (Rigify, Mixamo, VRoid, AutoRig)
      // Pass 1: Try to find actual Bones first
      scene.traverse((node: any) => {
        if (!node.isBone) return;
        hasBones = true;
        const name = node.name.toLowerCase();
        
        if (!mapped.head && /head|neck/i.test(name) && !/headtop/i.test(name)) mapped.head = node;
        if (!mapped.leftArm && /(arm|shoulder).*\.l|(arm|shoulder).*_l|left.*(arm|shoulder)/i.test(name)) mapped.leftArm = node;
        if (!mapped.rightArm && /(arm|shoulder).*\.r|(arm|shoulder).*_r|right.*(arm|shoulder)/i.test(name)) mapped.rightArm = node;
        if (!mapped.leftElbow && /elbow.*\.l|elbow.*_l|left.*elbow|left.*forearm/i.test(name)) mapped.leftElbow = node;
        if (!mapped.rightElbow && /elbow.*\.r|elbow.*_r|right.*elbow|right.*forearm/i.test(name)) mapped.rightElbow = node;
        if (!mapped.leftLeg && /(leg|thigh).*\.l|(leg|thigh).*_l|left.*(leg|thigh|up.*leg)/i.test(name)) mapped.leftLeg = node;
        if (!mapped.rightLeg && /(leg|thigh).*\.r|(leg|thigh).*_r|right.*(leg|thigh|up.*leg)/i.test(name)) mapped.rightLeg = node;
        if (!mapped.leftKnee && /knee.*\.l|knee.*_l|left.*knee|left.*leg.*lower|left.*calf/i.test(name)) mapped.leftKnee = node;
        if (!mapped.rightKnee && /knee.*\.r|knee.*_r|right.*knee|right.*leg.*lower|right.*calf/i.test(name)) mapped.rightKnee = node;
        if (!mapped.spine && /spine|torso|hips|pelvis/i.test(name)) mapped.spine = node;
      });

      // Pass 2: Fallback to non-bones (e.g. groups/meshes) if not a proper skeleton
      if (!hasBones) {
        scene.traverse((node) => {
          const name = node.name.toLowerCase();
          if (node.type !== 'Object3D' && node.type !== 'Mesh' && node.type !== 'Group') return;

          if (!mapped.head && /head|neck/i.test(name) && !/headtop/i.test(name)) mapped.head = node;
          if (!mapped.leftArm && /(arm|shoulder).*\.l|(arm|shoulder).*_l|left.*(arm|shoulder)/i.test(name)) mapped.leftArm = node;
          if (!mapped.rightArm && /(arm|shoulder).*\.r|(arm|shoulder).*_r|right.*(arm|shoulder)/i.test(name)) mapped.rightArm = node;
          if (!mapped.leftElbow && /elbow.*\.l|elbow.*_l|left.*elbow|left.*forearm/i.test(name)) mapped.leftElbow = node;
          if (!mapped.rightElbow && /elbow.*\.r|elbow.*_r|right.*elbow|right.*forearm/i.test(name)) mapped.rightElbow = node;
          if (!mapped.leftLeg && /(leg|thigh).*\.l|(leg|thigh).*_l|left.*(leg|thigh|up.*leg)/i.test(name)) mapped.leftLeg = node;
          if (!mapped.rightLeg && /(leg|thigh).*\.r|(leg|thigh).*_r|right.*(leg|thigh|up.*leg)/i.test(name)) mapped.rightLeg = node;
          if (!mapped.leftKnee && /knee.*\.l|knee.*_l|left.*knee|left.*leg.*lower|left.*calf/i.test(name)) mapped.leftKnee = node;
          if (!mapped.rightKnee && /knee.*\.r|knee.*_r|right.*knee|right.*leg.*lower|right.*calf/i.test(name)) mapped.rightKnee = node;
          if (!mapped.spine && /spine|torso|hips|pelvis/i.test(name)) mapped.spine = node;
        });
      }
      
      const baseRots: Record<string, THREE.Euler> = {};
      Object.entries(mapped).forEach(([key, node]) => {
        baseRots[key] = node.rotation.clone();
      });
      
      bonesRef.current = mapped;
      baseRotationsRef.current = baseRots;
      
    } else if (!isRigged && scene) {
      // Reset model to base rotations
      Object.entries(bonesRef.current).forEach(([key, node]) => {
        if (baseRotationsRef.current[key]) {
          node.rotation.copy(baseRotationsRef.current[key]);
        }
      });
      scene.position.y = 0;
      bonesRef.current = {};
    }
  }, [isRigged, scene]);

  const handlePointerDown = (e: any) => {
    e.stopPropagation();
    setSelectedModelId(id);
    if (e.object.name) {
      setSelectedPart(e.object.name);
    }
  };

  useFrame(() => {
    if (!scene || !isRigged) return;
    
    const t = (currentFrame / totalFrames) * Math.PI * 4;
    const mapped = bonesRef.current;
    const base = baseRotationsRef.current;
    
    if (motionData && motionData[currentFrame]) {
       const frameData = motionData[currentFrame];
       
       const applyRotation = (node: THREE.Object3D, kp1: any, kp2: any, axis: THREE.Vector3 = new THREE.Vector3(0, -1, 0)) => {
         if (!node || !kp1 || !kp2) return;
         
         // BlazePose Array Format: [x, y, z]
         // Map x (right), y (down), z (forward in meters)
         // To Three: x (right), y (up), z (backward)
         const dir = new THREE.Vector3(
           kp2[0] - kp1[0],
           -(kp2[1] - kp1[1]), // Flip Y
           -(kp2[2] - kp1[2])  // Flip Z
         ).normalize();
         
         const quaternion = new THREE.Quaternion().setFromUnitVectors(axis, dir);
         node.quaternion.slerp(quaternion, 0.2);
       };

       scene.position.y = THREE.MathUtils.lerp(scene.position.y, 0, 0.2);

       if (mapped.leftArm) applyRotation(mapped.leftArm, frameData[11], frameData[13]);
       if (mapped.rightArm) applyRotation(mapped.rightArm, frameData[12], frameData[14]);
       if (mapped.leftElbow) applyRotation(mapped.leftElbow, frameData[13], frameData[15]);
       if (mapped.rightElbow) applyRotation(mapped.rightElbow, frameData[14], frameData[16]);
       
       if (mapped.leftLeg) applyRotation(mapped.leftLeg, frameData[23], frameData[25]);
       if (mapped.rightLeg) applyRotation(mapped.rightLeg, frameData[24], frameData[26]);
       if (mapped.leftKnee) applyRotation(mapped.leftKnee, frameData[25], frameData[27]);
       if (mapped.rightKnee) applyRotation(mapped.rightKnee, frameData[26], frameData[28]);

       if (mapped.spine) {
         // Hip rotation logic could be more complex, but at least align spine
         applyRotation(mapped.spine, frameData[23], frameData[11], new THREE.Vector3(0, 1, 0));
       }
    } else {
      // Apply animations to mapped bones
      const walkSpeed = t * 2;
      scene.position.y = THREE.MathUtils.lerp(scene.position.y, Math.abs(Math.sin(walkSpeed)) * 0.05, 0.2);

      if (mapped.spine && base.spine) {
        mapped.spine.rotation.y = THREE.MathUtils.lerp(mapped.spine.rotation.y, base.spine.y + Math.sin(walkSpeed) * 0.1, 0.2);
      }

      if (mapped.head && base.head) {
        mapped.head.rotation.x = THREE.MathUtils.lerp(mapped.head.rotation.x, base.head.x + Math.sin(walkSpeed * 2) * 0.05, 0.2);
        mapped.head.rotation.y = THREE.MathUtils.lerp(mapped.head.rotation.y, base.head.y - Math.sin(walkSpeed) * 0.1, 0.2);
      }
      
      if (mapped.leftArm && base.leftArm) {
        mapped.leftArm.rotation.x = THREE.MathUtils.lerp(mapped.leftArm.rotation.x, base.leftArm.x + Math.cos(walkSpeed) * 0.6, 0.2);
        mapped.leftArm.rotation.z = THREE.MathUtils.lerp(mapped.leftArm.rotation.z, base.leftArm.z + 0.1, 0.2);
      }
      
      if (mapped.rightArm && base.rightArm) {
        mapped.rightArm.rotation.x = THREE.MathUtils.lerp(mapped.rightArm.rotation.x, base.rightArm.x - Math.cos(walkSpeed) * 0.6, 0.2);
        mapped.rightArm.rotation.z = THREE.MathUtils.lerp(mapped.rightArm.rotation.z, base.rightArm.z - 0.1, 0.2);
      }

      if (mapped.leftElbow && base.leftElbow) {
        const bend = Math.max(0, Math.cos(walkSpeed)) * 0.5 + 0.1;
        mapped.leftElbow.rotation.x = THREE.MathUtils.lerp(mapped.leftElbow.rotation.x, base.leftElbow.x + bend, 0.2);
        if (mapped.leftElbow.rotation.z !== undefined) {
          mapped.leftElbow.rotation.z = THREE.MathUtils.lerp(mapped.leftElbow.rotation.z, base.leftElbow.z, 0.2);
        }
      }

      if (mapped.rightElbow && base.rightElbow) {
        const bend = Math.max(0, -Math.cos(walkSpeed)) * 0.5 + 0.1;
        mapped.rightElbow.rotation.x = THREE.MathUtils.lerp(mapped.rightElbow.rotation.x, base.rightElbow.x + bend, 0.2);
        if (mapped.rightElbow.rotation.z !== undefined) {
          mapped.rightElbow.rotation.z = THREE.MathUtils.lerp(mapped.rightElbow.rotation.z, base.rightElbow.z, 0.2);
        }
      }
      
      if (mapped.leftLeg && base.leftLeg) {
        mapped.leftLeg.rotation.x = THREE.MathUtils.lerp(mapped.leftLeg.rotation.x, base.leftLeg.x - Math.cos(walkSpeed) * 0.7, 0.2);
      }
      
      if (mapped.rightLeg && base.rightLeg) {
        mapped.rightLeg.rotation.x = THREE.MathUtils.lerp(mapped.rightLeg.rotation.x, base.rightLeg.x + Math.cos(walkSpeed) * 0.7, 0.2);
      }

      if (mapped.leftKnee && base.leftKnee) {
        const bend = Math.max(0, -Math.cos(walkSpeed)) * 0.8 + 0.05;
        mapped.leftKnee.rotation.x = THREE.MathUtils.lerp(mapped.leftKnee.rotation.x, base.leftKnee.x + bend, 0.2);
      }

      if (mapped.rightKnee && base.rightKnee) {
        const bend = Math.max(0, Math.cos(walkSpeed)) * 0.8 + 0.05;
        mapped.rightKnee.rotation.x = THREE.MathUtils.lerp(mapped.rightKnee.rotation.x, base.rightKnee.x + bend, 0.2);
      }
    }
  });

  return (
    <group position={position}>
      <primitive 
        object={scene} 
        onPointerDown={handlePointerDown} 
        scale={1}
      />
      {isSelected && (
        <BoxMesh args={[2, 4, 2]} position={[0, 2, 0]}>
          <meshBasicMaterial color="#ffff00" wireframe transparent opacity={0.3} />
        </BoxMesh>
      )}
    </group>
  );
}

function SkeletonModel({ id, position, isRigged }: { id: string, position: [number, number, number], isRigged: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const { currentFrame, totalFrames, selectedPart, setSelectedPart, selectedModelId, setSelectedModelId, updateModelPosition, currentProject } = useEditorStore();
  const isSelected = selectedModelId === id;

  // motionData is already parsed in Editor.tsx
  const motionData = currentProject?.motionData;

  const material = useMemo(() => new THREE.MeshStandardMaterial({ color: '#b0b0b0', roughness: 0.5, metalness: 0.1 }), []);
  const jointMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: '#f59e0b' }), []);
  const selectedMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: '#3b82f6', emissive: '#1d4ed8' }), []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isSelected) return;
      const speed = 0.5;
      if (e.key.toLowerCase() === 'w') updateModelPosition(id, [0, 0, -speed]);
      if (e.key.toLowerCase() === 's') updateModelPosition(id, [0, 0, speed]);
      if (e.key.toLowerCase() === 'a') updateModelPosition(id, [-speed, 0, 0]);
      if (e.key.toLowerCase() === 'd') updateModelPosition(id, [speed, 0, 0]);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSelected, id, updateModelPosition]);

  useFrame(() => {
    if (!groupRef.current || !isRigged) return;
    
    const t = (currentFrame / totalFrames) * Math.PI * 4;
    
    if (motionData && motionData[currentFrame]) {
       const frameData = motionData[currentFrame];
       
        const applyRotation = (node: THREE.Object3D, kp1: any, kp2: any, axis: THREE.Vector3 = new THREE.Vector3(0, -1, 0)) => {
          if (!node || !kp1 || !kp2) return;
          
          // BlazePose Array Format: [x, y, z]
          const dir = new THREE.Vector3(
            kp2[0] - kp1[0],
            -(kp2[1] - kp1[1]),
            -(kp2[2] - kp1[2])
          ).normalize();
          
          const quaternion = new THREE.Quaternion().setFromUnitVectors(axis, dir);
          node.quaternion.slerp(quaternion, 0.2);
        };

       const armsGroup = groupRef.current;
       const leftArm = armsGroup.children.find(c => c.name === 'left-arm');
       const rightArm = armsGroup.children.find(c => c.name === 'right-arm');
       const leftLeg = armsGroup.children.find(c => c.name === 'left-leg');
       const rightLeg = armsGroup.children.find(c => c.name === 'right-leg');

       if (leftArm) applyRotation(leftArm, frameData[11], frameData[13]);
       if (rightArm) applyRotation(rightArm, frameData[12], frameData[14]);
       if (leftLeg) applyRotation(leftLeg, frameData[23], frameData[25]);
       if (rightLeg) applyRotation(rightLeg, frameData[24], frameData[26]);
       
       groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, position[1] + 1.2, 0.1);
    } else {
      // Fallback sine wave animation
      groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, position[1] + Math.sin(t * 2) * 0.1 + 1.2, 0.1);
      
      const head = groupRef.current.children.find(c => c.name === 'head');
      if (head) {
        head.rotation.x = THREE.MathUtils.lerp(head.rotation.x, 0, 0.2);
        head.rotation.y = THREE.MathUtils.lerp(head.rotation.y, Math.sin(t) * 0.2, 0.2);
        head.rotation.z = THREE.MathUtils.lerp(head.rotation.z, Math.cos(t) * 0.1, 0.2);
      }
      
      const leftArm = groupRef.current.children.find(c => c.name === 'left-arm');
      if (leftArm) {
        leftArm.rotation.x = THREE.MathUtils.lerp(leftArm.rotation.x, 0, 0.2);
        leftArm.rotation.y = THREE.MathUtils.lerp(leftArm.rotation.y, Math.cos(t) * 0.5, 0.2);
        leftArm.rotation.z = THREE.MathUtils.lerp(leftArm.rotation.z, Math.sin(t) * 1.5, 0.2);
      }
      
      const rightArm = groupRef.current.children.find(c => c.name === 'right-arm');
      if (rightArm) {
        rightArm.rotation.x = THREE.MathUtils.lerp(rightArm.rotation.x, 0, 0.2);
        rightArm.rotation.y = THREE.MathUtils.lerp(rightArm.rotation.y, -Math.cos(t) * 0.5, 0.2);
        rightArm.rotation.z = THREE.MathUtils.lerp(rightArm.rotation.z, Math.sin(t + Math.PI) * 1.5, 0.2);
      }
      
      const leftLeg = groupRef.current.children.find(c => c.name === 'left-leg');
      if (leftLeg) {
        leftLeg.rotation.x = THREE.MathUtils.lerp(leftLeg.rotation.x, Math.sin(t) * 1.2, 0.2);
        leftLeg.rotation.y = THREE.MathUtils.lerp(leftLeg.rotation.y, 0, 0.2);
        leftLeg.rotation.z = THREE.MathUtils.lerp(leftLeg.rotation.z, 0, 0.2);
      }
      
      const rightLeg = groupRef.current.children.find(c => c.name === 'right-leg');
      if (rightLeg) {
        rightLeg.rotation.x = THREE.MathUtils.lerp(rightLeg.rotation.x, Math.sin(t + Math.PI) * 1.2, 0.2);
        rightLeg.rotation.y = THREE.MathUtils.lerp(rightLeg.rotation.y, 0, 0.2);
        rightLeg.rotation.z = THREE.MathUtils.lerp(rightLeg.rotation.z, 0, 0.2);
      }
    }
  });

  const handleSelect = (e: any, name: string) => {
    e.stopPropagation();
    setSelectedModelId(id);
    setSelectedPart(name);
  };

  return (
    <group position={[position[0], position[1] + 1.2, position[2]]}>
      <group ref={groupRef} onPointerDown={(e) => { e.stopPropagation(); setSelectedModelId(id); }}>
        {/* Torso */}
        <Cylinder args={[0.15, 0.1, 0.8]} material={selectedPart === 'torso' ? selectedMaterial : material} name="torso" onClick={(e) => handleSelect(e, 'torso')} />
        
        {/* Neck & Head */}
        <group position={[0, 0.45, 0]} name="head" onClick={(e) => handleSelect(e, 'head')}>
          <Sphere args={[0.08]} material={jointMaterial} position={[0, 0, 0]} />
          <Sphere args={[0.2]} material={selectedPart === 'head' ? selectedMaterial : material} position={[0, 0.25, 0]} />
        </group>

        {/* Shoulders & Arms */}
        <group position={[-0.25, 0.35, 0]} name="right-arm" onClick={(e) => handleSelect(e, 'right-arm')}>
          <Sphere args={[0.1]} material={jointMaterial} position={[0, 0, 0]} />
          <Cylinder args={[0.06, 0.05, 0.6]} material={selectedPart === 'right-arm' ? selectedMaterial : material} position={[0, -0.3, 0]} />
        </group>

        <group position={[0.25, 0.35, 0]} name="left-arm" onClick={(e) => handleSelect(e, 'left-arm')}>
          <Sphere args={[0.1]} material={jointMaterial} position={[0, 0, 0]} />
          <Cylinder args={[0.06, 0.05, 0.6]} material={selectedPart === 'left-arm' ? selectedMaterial : material} position={[0, -0.3, 0]} />
        </group>

        {/* Hips & Legs */}
        <group position={[-0.15, -0.45, 0]} name="right-leg" onClick={(e) => handleSelect(e, 'right-leg')}>
          <Sphere args={[0.08]} material={jointMaterial} position={[0, 0, 0]} />
          <Cylinder args={[0.08, 0.06, 0.7]} material={selectedPart === 'right-leg' ? selectedMaterial : material} position={[0, -0.35, 0]} />
        </group>
        <group position={[0.15, -0.45, 0]} name="left-leg" onClick={(e) => handleSelect(e, 'left-leg')}>
          <Sphere args={[0.08]} material={jointMaterial} position={[0, 0, 0]} />
          <Cylinder args={[0.08, 0.06, 0.7]} material={selectedPart === 'left-leg' ? selectedMaterial : material} position={[0, -0.35, 0]} />
        </group>
      </group>
      {isSelected && (
        <BoxMesh args={[1.5, 2.5, 1.5]} position={[0, 0, 0]}>
          <meshBasicMaterial color="#ffff00" wireframe transparent opacity={0.3} />
        </BoxMesh>
      )}
    </group>
  );
}

export function Viewport3D({ isPlaying, currentFrame: unusedKey, totalFrames: unusedTotal }: Scene3DProps) {
  const { models } = useEditorStore();
  
  return (
    <group>
      {models.map(m => {
        if (m.type === 'skeleton') {
          return <SkeletonModel key={m.id} id={m.id} position={m.position} isRigged={m.isRigged} />;
        }
        return m.url ? <CustomModel key={m.id} id={m.id} url={m.url} position={m.position} isRigged={m.isRigged} /> : null;
      })}
    </group>
  );
}
