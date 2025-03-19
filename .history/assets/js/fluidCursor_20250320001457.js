// Fluid Cursor Effect
class FluidCursor {
    // 基础顶点着色器
    vertexShader = `
        precision highp float;
        attribute vec2 aPosition;
        varying vec2 vUv;
        varying vec2 vL;
        varying vec2 vR;
        varying vec2 vT;
        varying vec2 vB;
        uniform vec2 texelSize;
        void main () {
            vUv = aPosition * 0.5 + 0.5;
            vL = vUv - vec2(texelSize.x, 0.0);
            vR = vUv + vec2(texelSize.x, 0.0);
            vT = vUv + vec2(0.0, texelSize.y);
            vB = vUv - vec2(0.0, texelSize.y);
            gl_Position = vec4(aPosition, 0.0, 1.0);
        }
    `;

    // 基础显示着色器
    displayShaderSource = `
        precision highp float;
        precision highp sampler2D;
        varying vec2 vUv;
        uniform sampler2D uTexture;
        void main () {
            vec3 c = texture2D(uTexture, vUv).rgb;
            float a = max(c.r, max(c.g, c.b));
            gl_FragColor = vec4(c, a);
        }
    `;

    constructor({
        // Default configuration parameters
        simResolution = 128,
        dyeResolution = 1440,
        captureResolution = 512,
        densityDissipation = 3.5,
        velocityDissipation = 2,
        pressure = 0.1,
        pressureIterations = 20,
        curl = 3,
        splatRadius = 0.2,
        splatForce = 6000,
        shading = true,
        colorUpdateSpeed = 10,
        backColor = { r: 0.5, g: 0, b: 0 },
        transparent = true
    } = {}) {
        this.config = {
            SIM_RESOLUTION: simResolution,
            DYE_RESOLUTION: dyeResolution,
            CAPTURE_RESOLUTION: captureResolution,
            DENSITY_DISSIPATION: densityDissipation,
            VELOCITY_DISSIPATION: velocityDissipation,
            PRESSURE: pressure,
            PRESSURE_ITERATIONS: pressureIterations,
            CURL: curl,
            SPLAT_RADIUS: splatRadius,
            SPLAT_FORCE: splatForce,
            SHADING: shading,
            COLOR_UPDATE_SPEED: colorUpdateSpeed,
            PAUSED: false,
            BACK_COLOR: backColor,
            TRANSPARENT: transparent,
        };

        this.canvas = null;
        this.pointers = [];
        this.gl = null;
        this.ext = null;
        this.programs = null;
        this.bloomFramebuffers = [];
        this.sunraysFramebuffers = [];
        this.ditheringTexture = null;
        this.blurProgram = null;
        this.copyProgram = null;
        this.clearProgram = null;
        this.colorProgram = null;
        this.bloomPrefilterProgram = null;
        this.bloomBlurProgram = null;
        this.bloomFinalProgram = null;
        this.sunraysMaskProgram = null;
        this.sunraysProgram = null;
        this.splatProgram = null;
        this.advectionProgram = null;
        this.divergenceProgram = null;
        this.curlProgram = null;
        this.vorticityProgram = null;
        this.pressureProgram = null;
        this.gradienSubtractProgram = null;
        this.displayMaterial = null;
        this.dye = null;
        this.velocity = null;
        this.divergence = null;
        this.curl = null;
        this.pressure = null;
        this.lastUpdateTime = Date.now();
        this.colorUpdateTimer = 0;
        this.animationFrameId = null;
        this.isInitialized = false;
    }

    // Initialize the fluid cursor effect
    init(canvasId) {
        if (this.isInitialized) return;

        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            console.error(`Canvas with id '${canvasId}' not found`);
            return;
        }

        // Initialize pointers for tracking mouse/touch interactions
        this.pointers = [new this.pointerPrototype()];

        // Get WebGL context
        const { gl, ext } = this.getWebGLContext(this.canvas);
        this.gl = gl;
        this.ext = ext;

        // Adjust configuration based on WebGL capabilities
        if (!ext.supportLinearFiltering) {
            this.config.DYE_RESOLUTION = 256;
            this.config.SHADING = false;
        }

        // Initialize WebGL programs and textures
        this.initWebGL();

        // Set up event listeners
        this.setupEventListeners();

        // Start the animation loop
        this.startAnimation();

        this.isInitialized = true;
    }

    // Pointer prototype for tracking mouse/touch interactions
    pointerPrototype() {
        this.id = -1;
        this.texcoordX = 0;
        this.texcoordY = 0;
        this.prevTexcoordX = 0;
        this.prevTexcoordY = 0;
        this.deltaX = 0;
        this.deltaY = 0;
        this.down = false;
        this.moved = false;
        this.color = [30, 0, 300];
    }

    // Get WebGL context and extensions
    getWebGLContext(canvas) {
        const params = {
            alpha: true,
            depth: false,
            stencil: false,
            antialias: false,
            preserveDrawingBuffer: false,
        };

        let gl = canvas.getContext('webgl2', params);
        const isWebGL2 = !!gl;
        if (!isWebGL2) {
            gl = canvas.getContext('webgl', params) || canvas.getContext('experimental-webgl', params);
        }

        let halfFloat;
        let supportLinearFiltering;
        if (isWebGL2) {
            gl.getExtension('EXT_color_buffer_float');
            supportLinearFiltering = gl.getExtension('OES_texture_float_linear');
        } else {
            halfFloat = gl.getExtension('OES_texture_half_float');
            supportLinearFiltering = gl.getExtension('OES_texture_half_float_linear');
        }

        gl.clearColor(0.0, 0.0, 0.0, 1.0);

        const halfFloatTexType = isWebGL2 ? gl.HALF_FLOAT : halfFloat.HALF_FLOAT_OES;
        let formatRGBA;
        let formatRG;
        let formatR;

        if (isWebGL2) {
            formatRGBA = this.getSupportedFormat(gl, gl.RGBA16F, gl.RGBA, halfFloatTexType);
            formatRG = this.getSupportedFormat(gl, gl.RG16F, gl.RG, halfFloatTexType);
            formatR = this.getSupportedFormat(gl, gl.R16F, gl.RED, halfFloatTexType);
        } else {
            formatRGBA = this.getSupportedFormat(gl, gl.RGBA, gl.RGBA, halfFloatTexType);
            formatRG = this.getSupportedFormat(gl, gl.RGBA, gl.RGBA, halfFloatTexType);
            formatR = this.getSupportedFormat(gl, gl.RGBA, gl.RGBA, halfFloatTexType);
        }

        return {
            gl,
            ext: {
                formatRGBA,
                formatRG,
                formatR,
                halfFloatTexType,
                supportLinearFiltering,
            },
        };
    }

    // Get supported WebGL format
    getSupportedFormat(gl, internalFormat, format, type) {
        if (!this.supportRenderTextureFormat(gl, internalFormat, format, type)) {
            switch (internalFormat) {
                case gl.R16F:
                    return this.getSupportedFormat(gl, gl.RG16F, gl.RG, type);
                case gl.RG16F:
                    return this.getSupportedFormat(gl, gl.RGBA16F, gl.RGBA, type);
                default:
                    return null;
            }
        }
        return { internalFormat, format };
    }

    // Check if render texture format is supported
    supportRenderTextureFormat(gl, internalFormat, format, type) {
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, 4, 4, 0, format, type, null);

        const fbo = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

        const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
        return status === gl.FRAMEBUFFER_COMPLETE;
    }

    // Initialize WebGL programs and textures
    initWebGL() {
        const gl = this.gl;

        // Compile shaders and create programs
        this.blurProgram = new this.Program(this.vertexShader, this.blurShader);
        this.copyProgram = new this.Program(this.vertexShader, this.copyShader);
        this.clearProgram = new this.Program(this.vertexShader, this.clearShader);
        this.colorProgram = new this.Program(this.vertexShader, this.colorShader);
        this.splatProgram = new this.Program(this.vertexShader, this.splatShader);
        this.advectionProgram = new this.Program(this.vertexShader, this.advectionShader);
        this.divergenceProgram = new this.Program(this.vertexShader, this.divergenceShader);
        this.curlProgram = new this.Program(this.vertexShader, this.curlShader);
        this.vorticityProgram = new this.Program(this.vertexShader, this.vorticityShader);
        this.pressureProgram = new this.Program(this.vertexShader, this.pressureShader);
        this.gradienSubtractProgram = new this.Program(this.vertexShader, this.gradientSubtractShader);

        // Create display material
        this.displayMaterial = new this.Material(this.vertexShader, this.displayShaderSource);

        // Create textures
        this.createDoubleFBO();
    }

    // Material class for shader programs
    Material(vertexShader, fragmentShaderSource) {
        const material = {
            vertexShader,
            fragmentShaderSource,
            programs: [],
            activeProgram: null,
            uniforms: [],
            gl: this.gl,

            setKeywords: (keywords) => {
                let hash = 0;
                for (let i = 0; i < keywords.length; i++) {
                    hash += this.hashCode(keywords[i]);
                }

                let program = material.programs[hash];
                if (program == null) {
                    let fragmentShader = this.compileShader(
                        material.gl.FRAGMENT_SHADER,
                        material.fragmentShaderSource,
                        keywords
                    );
                    program = this.createProgram(material.vertexShader, fragmentShader);
                    material.programs[hash] = program;
                }

                if (program === material.activeProgram) return;

                material.uniforms = this.getUniforms(program);
                material.activeProgram = program;
            },

            bind: () => {
                material.gl.useProgram(material.activeProgram);
            }
        };

        return material;
    }

    // Program class for shader programs
    Program(vertexShader, fragmentShader) {
        const program = {
            uniforms: {},
            program: this.createProgram(vertexShader, fragmentShader),
            gl: this.gl
        };

        program.uniforms = this.getUniforms(program.program);

        program.bind = () => {
            program.gl.useProgram(program.program);
        };

        return program;
    }

    // Create a WebGL program from vertex and fragment shaders
    createProgram(vertexShader, fragmentShader) {
        const gl = this.gl;
        const program = gl.createProgram();

        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error(gl.getProgramInfoLog(program));
            return null;
        }

        return program;
    }

    // Compile a shader from source
    compileShader(type, source, keywords) {
        const gl = this.gl;
        source = this.addKeywords(source, keywords);

        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error(gl.getShaderInfoLog(shader));
            return null;
        }

        return shader;
    }

    // Add keywords to shader source
    addKeywords(source, keywords) {
        if (keywords == null) return source;
        let keywordsString = '';
        keywords.forEach(keyword => {
            keywordsString += '#define ' + keyword + '\n';
        });
        return keywordsString + source;
    }

    // Get uniforms from a program
    getUniforms(program) {
        const gl = this.gl;
        const uniforms = {};
        const uniformCount = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);

        for (let i = 0; i < uniformCount; i++) {
            const uniformName = gl.getActiveUniform(program, i).name;
            uniforms[uniformName] = gl.getUniformLocation(program, uniformName);
        }

        return uniforms;
    }

    // Create a double framebuffer object
    createDoubleFBO(width, height, internalFormat, format, type, param) {
        const gl = this.gl;
        const fbo1 = this.createFBO(width, height, internalFormat, format, type, param);
        const fbo2 = this.createFBO(width, height, internalFormat, format, type, param);
        return {
            read: fbo1,
            write: fbo2,
            swap() {
                const temp = this.read;
                this.read = this.write;
                this.write = temp;
            }
        };
    }

    // Create a framebuffer object
    createFBO(width, height, internalFormat, format, type, param) {
        const gl = this.gl;
        const config = this.config;
        width = width || gl.drawingBufferWidth;
        height = height || gl.drawingBufferHeight;

        const texture = gl.createTexture();
        const texType = type || this.ext.halfFloatTexType;
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, param ? gl.LINEAR : gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, param ? gl.LINEAR : gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, width, height, 0, format, texType, null);

        const fbo = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
        gl.viewport(0, 0, width, height);
        gl.clear(gl.COLOR_BUFFER_BIT);

        return {
            texture,
            fbo,
            width,
            height,
            attach(id) {
                gl.activeTexture(gl.TEXTURE0 + id);
                gl.bindTexture(gl.TEXTURE_2D, texture);
                return id;
            }
        };
    }

    // Initialize WebGL textures and framebuffers
    initFramebuffers() {
        const gl = this.gl;
        const ext = this.ext;
        const config = this.config;

        const simRes = this.getResolution(config.SIM_RESOLUTION);
        const dyeRes = this.getResolution(config.DYE_RESOLUTION);

        this.dye = this.createDoubleFBO(
            dyeRes.width,
            dyeRes.height,
            ext.formatRGBA.internalFormat,
            ext.formatRGBA.format,
            ext.halfFloatTexType,
            ext.supportLinearFiltering
        );

        this.velocity = this.createDoubleFBO(
            simRes.width,
            simRes.height,
            ext.formatRG.internalFormat,
            ext.formatRG.format,
            ext.halfFloatTexType,
            ext.supportLinearFiltering
        );

        this.divergence = this.createFBO(
            simRes.width,
            simRes.height,
            ext.formatR.internalFormat,
            ext.formatR.format,
            ext.halfFloatTexType,
            ext.supportLinearFiltering
        );

        this.curl = this.createFBO(
            simRes.width,
            simRes.height,
            ext.formatR.internalFormat,
            ext.formatR.format,
            ext.halfFloatTexType,
            ext.supportLinearFiltering
        );

        this.pressure = this.createDoubleFBO(
            simRes.width,
            simRes.height,
            ext.formatR.internalFormat,
            ext.formatR.format,
            ext.halfFloatTexType,
            ext.supportLinearFiltering
        );
    }

    // Get resolution based on aspect ratio
    getResolution(resolution) {
        const aspectRatio = this.canvas.width / this.canvas.height;
        if (aspectRatio < 1) {
            resolution = Math.floor(resolution / aspectRatio);
        }
        const width = resolution;
        const height = Math.floor(resolution * aspectRatio);
        return { width, height };
    }

    // Hash code for shader keywords
    hashCode(s) {
        if (s.length === 0) return 0;
        let hash = 0;
        for (let i = 0; i < s.length; i++) {
            hash = (hash << 5) - hash + s.charCodeAt(i);
            hash |= 0; // Convert to 32bit integer
        }
        return hash;
    }

    // Setup event listeners for mouse and touch interactions
    setupEventListeners() {
        const canvas = this.canvas;

        canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        canvas.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        window.addEventListener('mouseup', this.handleMouseUp.bind(this));
        window.addEventListener('touchend', this.handleTouchEnd.bind(this));
        window.addEventListener('resize', this.handleResize.bind(this));

        // Initial resize
        this.handleResize();
    }

    // Handle mouse move events
    handleMouseMove(e) {
        const pointer = this.pointers[0];
        if (!pointer.down) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        this.updatePointerMoveData(pointer, x, y);
    }

    // Handle touch move events
    handleTouchMove(e) {
        e.preventDefault();
        const touches = e.targetTouches;
        const rect = this.canvas.getBoundingClientRect();
        
        for (let i = 0; i < touches.length; i++) {
            const pointer = this.pointers[i];
            if (!pointer.down) continue;
            
            const x = touches[i].clientX - rect.left;
            const y = touches[i].clientY - rect.top;
            this.updatePointerMoveData(pointer, x, y);
        }
    }

    // Update pointer move data
    updatePointerMoveData(pointer, x, y) {
        pointer.moved = pointer.down;
        pointer.prevTexcoordX = pointer.texcoordX;
        pointer.prevTexcoordY = pointer.texcoordY;
        pointer.texcoordX = x / this.canvas.width;
        pointer.texcoordY = 1.0 - y / this.canvas.height;
        pointer.deltaX = (pointer.texcoordX - pointer.prevTexcoordX) * this.canvas.width;
        pointer.deltaY = (pointer.texcoordY - pointer.prevTexcoordY) * this.canvas.height;
        pointer.color = this.generateColor();
    }

    // Handle mouse down events
    handleMouseDown(e) {
        const pointer = this.pointers[0];
        pointer.down = true;
        pointer.color = this.generateColor();
        
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        pointer.texcoordX = x / this.canvas.width;
        pointer.texcoordY = 1.0 - y / this.canvas.height;
        pointer.prevTexcoordX = pointer.texcoordX;
        pointer.prevTexcoordY = pointer.texcoordY;
    }

    // Handle touch start events
    handleTouchStart(e) {
        e.preventDefault();
        const touches = e.targetTouches;
        const rect = this.canvas.getBoundingClientRect();
        
        for (let i = 0; i < touches.length; i++) {
            if (i >= this.pointers.length) {
                this.pointers.push(new this.pointerPrototype());
            }
            
            const pointer = this.pointers[i];
            pointer.id = touches[i].identifier;
            pointer.down = true;
            pointer.color = this.generateColor();
            
            const x = touches[i].clientX - rect.left;
            const y = touches[i].clientY - rect.top;
            pointer.texcoordX = x / this.canvas.width;
            pointer.texcoordY = 1.0 - y / this.canvas.height;
            pointer.prevTexcoordX = pointer.texcoordX;
            pointer.prevTexcoordY = pointer.texcoordY;
        }
    }

    // Handle mouse up events
    handleMouseUp() {
        this.pointers[0].down = false;
    }

    // Handle touch end events
    handleTouchEnd(e) {
        const touches = e.changedTouches;
        
        for (let i = 0; i < touches.length; i++) {
            const pointer = this.pointers.find(p => p.id === touches[i].identifier);
            if (pointer) pointer.down = false;
        }
    }

    // Handle window resize events
    handleResize() {
        const canvas = this.canvas;
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
        
        // Reinitialize framebuffers when canvas is resized
        this.initFramebuffers();
    }

    // Generate random color for splats
    generateColor() {
        const hue = Math.floor(Math.random() * 360);
        return [hue, 1.0, 0.5];
    }

    // Convert HSV to RGB color
    hsv2rgb(h, s, v) {
        let r, g, b;
        const i = Math.floor(h * 6);
        const f = h * 6 - i;
        const p = v * (1 - s);
        const q = v * (1 - f * s);
        const t = v * (1 - (1 - f) * s);

        switch (i % 6) {
            case 0: r = v; g = t; b = p; break;
            case 1: r = q; g = v; b = p; break;
            case 2: r = p; g = v; b = t; break;
            case 3: r = p; g = q; b = v; break;
            case 4: r = t; g = p; b = v; break;
            case 5: r = v; g = p; b = q; break;
        }

        return [r, g, b];
    }

    // Start animation loop
    startAnimation() {
        const update = () => {
            this.update();
            this.animationFrameId = requestAnimationFrame(update);
        };
        update();
    }

    // Stop animation loop
    stopAnimation() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    // Main update function called every frame
    update() {
        const gl = this.gl;
        const config = this.config;
        const dt = Math.min((Date.now() - this.lastUpdateTime) / 1000, 0.016);
        this.lastUpdateTime = Date.now();

        // Update color timer
        this.colorUpdateTimer += dt * config.COLOR_UPDATE_SPEED;

        // Process pointer interactions
        this.pointers.forEach(pointer => {
            if (pointer.moved) {
                this.splat(pointer.texcoordX, pointer.texcoordY, pointer.deltaX, pointer.deltaY, pointer.color);
                pointer.moved = false;
            }
        });

        // Fluid simulation steps
        this.step(dt);

        // Render to canvas
        this.render();
    }

    // Fluid simulation step
    step(dt) {
        const gl = this.gl;
        const config = this.config;

        // Advection step
        gl.disable(gl.BLEND);

        this.advectionProgram.bind();
        gl.uniform2f(this.advectionProgram.uniforms.texelSize, 1.0 / this.velocity.width, 1.0 / this.velocity.height);
        gl.uniform1i(this.advectionProgram.uniforms.uVelocity, this.velocity.read.attach(0));
        gl.uniform1i(this.advectionProgram.uniforms.uSource, this.velocity.read.attach(1));
        gl.uniform1f(this.advectionProgram.uniforms.dt, dt);
        gl.uniform1f(this.advection