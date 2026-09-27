(function () {
    'use strict';

    const THREE = window.THREE;
    const PIXELS_PER_UNIT = 32;
    const MODEL_URLS = {
        environment: 'assets/library_props.glb',
        character: 'assets/cosmo_3d.glb',
        desk: 'assets/desk_banker_lamp.glb',
        terminal: 'assets/aurora_terminal.glb'
    };

    class CosmoScene3DRenderer {
        constructor() {
            this.canvas = null;
            this.renderer = null;
            this.scene = null;
            this.camera = null;
            this.ready = false;
            this.models = {};
            this.environmentInstances = [];
            this.deskInstances = new Map();
            this.terminalInstances = new Map();
            this.platformsRef = null;
            this.computersRef = null;
            this.playerRoot = null;
            this.playerShadow = null;
            this.playerShield = null;
            this.lastFrameTime = 0;
            this.warnings = new Set();
        }

        warnOnce(key, message, error) {
            if (this.warnings.has(key)) return;
            this.warnings.add(key);
            console.warn(`[Cosmo 3D] ${message}`, error || '');
        }

        hasModel(key) {
            return this.ready && Boolean(this.models[key]);
        }

        init(canvas) {
            if (!THREE || !THREE.GLTFLoader || !canvas) {
                this.warnOnce('dependencies', 'Three.js or GLTFLoader unavailable; retaining Canvas renderer.');
                return false;
            }

            this.canvas = canvas;
            try {
                this.renderer = new THREE.WebGLRenderer({
                    canvas,
                    alpha: true,
                    antialias: true,
                    powerPreference: 'high-performance'
                });
                this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
                this.renderer.setClearColor(0x000000, 0);
                if (THREE.sRGBEncoding) this.renderer.outputEncoding = THREE.sRGBEncoding;
                if (THREE.ACESFilmicToneMapping) {
                    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
                    this.renderer.toneMappingExposure = 1;
                }

                this.scene = new THREE.Scene();
                this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 150);
                this.camera.up.set(0, 1, 0);

                this.scene.add(new THREE.HemisphereLight(0xD6F4FF, 0x25162D, 1.25));
                const key = new THREE.DirectionalLight(0xFFE6BE, 1.6);
                key.position.set(-7, 12, 18);
                this.scene.add(key);
                const fill = new THREE.DirectionalLight(0x60DFFF, 1.1);
                fill.position.set(10, 5, 9);
                this.scene.add(fill);
                const rim = new THREE.DirectionalLight(0xFFBD72, 0.7);
                rim.position.set(0, 10, -8);
                this.scene.add(rim);

                this.createPlayerEffects();
                this.resize();
                this.ready = true;
                this.loadModels();
                window.addEventListener('resize', () => this.resize());
                return true;
            } catch (error) {
                this.warnOnce('webgl', 'Could not initialize WebGL overlay; Canvas renderer remains active.', error);
                this.ready = false;
                if (this.renderer) this.renderer.dispose();
                this.renderer = null;
                return false;
            }
        }

        createPlayerEffects() {
            this.playerRoot = new THREE.Group();
            this.playerRoot.name = 'Live COSMO GLB character';
            this.scene.add(this.playerRoot);

            const shadow = new THREE.Mesh(
                new THREE.CircleGeometry(1, 36),
                new THREE.MeshBasicMaterial({
                    color: 0x020712,
                    transparent: true,
                    opacity: 0.5,
                    depthWrite: false,
                    side: THREE.DoubleSide
                })
            );
            shadow.name = 'Soft elliptical contact shadow';
            shadow.rotation.x = -Math.PI / 2;
            shadow.scale.set(1.6, 0.33, 1);
            shadow.position.set(0, 0.045, 2.3);
            this.scene.add(shadow);
            this.playerShadow = shadow;

            this.playerShield = new THREE.Mesh(
                new THREE.SphereGeometry(1, 28, 20),
                new THREE.MeshBasicMaterial({
                    color: 0x28E8FF,
                    transparent: true,
                    opacity: 0.19,
                    wireframe: true,
                    depthWrite: false
                })
            );
            this.playerShield.name = 'Aurora nano-shield';
            this.playerShield.visible = false;
            this.scene.add(this.playerShield);
        }

        loadModels() {
            const loader = new THREE.GLTFLoader();
            for (const [key, url] of Object.entries(MODEL_URLS)) {
                loader.load(url, (gltf) => {
                    if (!this.ready) return;
                    const model = gltf.scene;
                    model.name = `Blender asset | ${key}`;
                    this.prepareModel(key, model);
                    this.models[key] = model;
                    if (key === 'environment') this.createEnvironmentInstances();
                    if (key === 'desk' && this.platformsRef) this.syncPlatformModels(this.platformsRef, true);
                    if (key === 'terminal' && this.computersRef) this.syncTerminalModels(this.computersRef, true);
                }, undefined, (error) => {
                    this.warnOnce(`load-${key}`, `Failed to load ${url}; Canvas fallback remains active for this asset.`, error);
                });
            }
        }

        prepareModel(key, model) {
            model.traverse((object) => {
                if (!object.isMesh || !object.material) return;
                if (key !== 'environment') return;
                const soften = (source) => {
                    const material = source.clone();
                    material.transparent = true;
                    material.opacity = 0.62;
                    material.depthWrite = false;
                    material.needsUpdate = true;
                    return material;
                };
                object.material = Array.isArray(object.material)
                    ? object.material.map(soften)
                    : soften(object.material);
            });

            model.updateMatrixWorld(true);
            const bounds = new THREE.Box3().setFromObject(model);
            model.userData.bounds = bounds;
            model.userData.height = Math.max(0.01, bounds.max.y - bounds.min.y);
            model.userData.bottomY = bounds.min.y;
            model.userData.centerX = (bounds.min.x + bounds.max.x) * 0.5;
            model.userData.centerZ = (bounds.min.z + bounds.max.z) * 0.5;
        }

        centerModel(model) {
            model.position.x -= model.userData.centerX || 0;
            model.position.z -= model.userData.centerZ || 0;
        }

        createEnvironmentInstances() {
            const source = this.models.environment;
            if (!source || this.environmentInstances.length) return;
            const width = source.userData.bounds.max.x - source.userData.bounds.min.x;
            const repeat = Math.max(1, width + 0.05);
            this.environmentRepeat = repeat;
            for (let tile = -2; tile < 6; tile++) {
                const instance = source.clone(true);
                instance.name = `Library nave tile ${tile + 1}`;
                instance.position.set(tile * repeat, 0, -15);
                this.scene.add(instance);
                this.environmentInstances.push(instance);
            }
        }

        resize() {
            if (!this.renderer || !this.canvas) return;
            const width = Math.max(1, window.innerWidth || this.canvas.clientWidth || 1);
            const height = Math.max(1, window.innerHeight || this.canvas.clientHeight || 1);
            this.renderer.setSize(width, height, false);
            this.camera.left = -width / (2 * PIXELS_PER_UNIT);
            this.camera.right = width / (2 * PIXELS_PER_UNIT);
            this.camera.top = height / (2 * PIXELS_PER_UNIT);
            this.camera.bottom = -height / (2 * PIXELS_PER_UNIT);
            this.camera.updateProjectionMatrix();
        }

        clearInstanceMap(map) {
            for (const group of map.values()) this.scene.remove(group);
            map.clear();
        }

        syncPlatformModels(platforms, force = false) {
            if (!force && this.platformsRef === platforms && this.platformsFloorY === this.worldFloorY) return;
            this.platformsRef = platforms;
            this.platformsFloorY = this.worldFloorY;
            this.clearInstanceMap(this.deskInstances);
            if (!this.models.desk || !platforms) return;

            for (const platform of platforms) {
                if (platform.type !== 'desk') continue;
                const group = this.models.desk.clone(true);
                this.centerModel(group);
                const scaleX = platform.w / (3.3 * PIXELS_PER_UNIT);
                const scaleY = 6.6;
                group.scale.set(scaleX, scaleY, 0.92);
                group.position.set(
                    (platform.x + platform.w * 0.5) / PIXELS_PER_UNIT,
                    (this.worldFloorY - platform.y) / PIXELS_PER_UNIT - 1.2 * scaleY,
                    0.2
                );
                this.scene.add(group);
                this.deskInstances.set(platform, group);
            }
        }

        syncTerminalModels(computers, force = false) {
            if (!force && this.computersRef === computers && this.computersFloorY === this.worldFloorY) return;
            this.computersRef = computers;
            this.computersFloorY = this.worldFloorY;
            this.clearInstanceMap(this.terminalInstances);
            if (!this.models.terminal || !computers) return;

            for (const computer of computers) {
                const group = this.models.terminal.clone(true);
                this.centerModel(group);
                const depth = this.getDepthPerspective(computer.y);
                const scale = 3.65 * depth;
                const scaleX = scale;
                const scaleY = scale;
                const scaleZ = scale;
                group.scale.set(scaleX, scaleY, scaleZ);
                group.position.set(
                    (computer.x + computer.w * 0.5) / PIXELS_PER_UNIT,
                    (this.worldFloorY - computer.y) / PIXELS_PER_UNIT - (this.models.terminal.userData.bottomY * scaleY),
                    1.8
                );
                this.scene.add(group);
                this.terminalInstances.set(computer, group);
            }
        }

        getDepthPerspective(worldY) {
            const screenHeight = window.innerHeight || 1;
            const ground = screenHeight - 55;
            const roomDepth = Math.max(240, Math.min(580, screenHeight * 0.68));
            const ratio = Math.max(0, Math.min(1, (worldY - (ground - roomDepth)) / roomDepth));
            return 0.5 + 0.5 * ratio;
        }

        updatePlayer(player) {
            if (!player || !this.models.character || !this.playerRoot) {
                this.playerRoot.visible = false;
                this.playerShadow.visible = false;
                this.playerShield.visible = false;
                return;
            }

            if (!this.playerRoot.children.length) {
                const model = this.models.character.clone(true);
                this.centerModel(model);
                this.playerRoot.add(model);
                this.characterBaseScale = player.h / (this.models.character.userData.height * PIXELS_PER_UNIT);
            }

            const depth = this.getDepthPerspective(player.y + player.h);
            const squash = player.squashStretch;
            const scale = this.characterBaseScale * depth;
            const worldFloor = (window.innerHeight || 1) - 55;
            const footY = worldFloor - (player.y + player.h);
            this.playerRoot.visible = !(player.invulnerableTimer > 0 && Math.floor(Date.now() / 80) % 2 === 0);
            this.playerRoot.position.set(
                (player.x + player.w * 0.5) / PIXELS_PER_UNIT,
                footY / PIXELS_PER_UNIT - this.models.character.userData.bottomY * scale * squash,
                2.25 + (depth - 0.5) * 2.4
            );
            this.playerRoot.scale.set(scale / squash, scale * squash, scale);
            this.playerRoot.rotation.y = player.facingRight ? -0.48 : 0.48;
            this.playerRoot.rotation.x = player.flipRotation;
            if (player.grounded) this.playerRoot.position.y += Math.abs(Math.sin(player.runAnimTimer)) * 0.075;

            this.playerShadow.position.set(
                (player.x + player.w * 0.5) / PIXELS_PER_UNIT,
                0.05,
                2.3 + (depth - 0.5) * 2.4
            );
            this.playerShadow.scale.set(1.6 * depth, 0.33 * depth, 1);
            this.playerShadow.material.opacity = Math.max(0.12, 0.52 - Math.max(0, footY) / 900);
            this.playerShadow.visible = true;

            this.playerShield.visible = Boolean(player.hasShield);
            if (player.hasShield) {
                this.playerShield.position.copy(this.playerRoot.position);
                this.playerShield.scale.set(0.92 * scale, 1.12 * scale, 0.82 * scale);
                this.playerShield.rotation.y = Math.sin(Date.now() / 1400) * 0.12;
            }
        }

        render(gameState, groundY) {
            if (!this.ready || !this.renderer || !this.scene || !this.camera) return;
            const height = window.innerHeight || 1;
            const width = window.innerWidth || 1;
            this.worldFloorY = height - 55;
            this.syncPlatformModels(gameState.platforms);
            this.syncTerminalModels(gameState.computers);
            this.updatePlayer(gameState.player);

            const cameraX = (gameState.cameraX + width * 0.5) / PIXELS_PER_UNIT;
            const cameraY = (groundY - height * 0.5) / PIXELS_PER_UNIT;
            this.camera.position.set(cameraX, cameraY, 34);
            this.camera.lookAt(cameraX, cameraY, 0);
            this.camera.updateMatrixWorld(true);

            const now = performance.now();
            if (this.lastFrameTime && now - this.lastFrameTime < 8) return;
            this.lastFrameTime = now;
            try {
                this.renderer.render(this.scene, this.camera);
            } catch (error) {
                this.warnOnce('render', 'WebGL draw failed; switching back to Canvas.', error);
                this.ready = false;
                this.canvas.style.display = 'none';
            }
        }

        dispose() {
            if (this.renderer) this.renderer.dispose();
            this.ready = false;
            this.canvas = null;
        }
    }

    const renderer = new CosmoScene3DRenderer();
    const canvas = document.getElementById('game3dCanvas');
    const initialized = renderer.init(canvas);
    window.CosmoScene3D = renderer;
    if (!initialized && canvas) canvas.style.display = 'none';
})();