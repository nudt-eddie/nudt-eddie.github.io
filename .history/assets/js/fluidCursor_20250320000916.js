// Fluid Cursor Effect
class FluidCursor {
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
        this.vertexShader = vertexShader;
        this.fragmentShaderSource = fragmentShaderSource;
        this.programs = [];
        this.activeProgram = null;
        this.uniforms = [];

        return {
            setKeywords: (keywords) => {
                let hash = 0;
                for (let i = 0; i < keywords.length; i++) {
                    hash += this.hashCode(keywords[i]);
                }

                let program = this.programs[hash];
                if (program == null) {
                    let fragmentShader = this.compileShader(
                        this.gl.FRAGMENT_SHADER,
                        this.fragmentShaderSource,
                        keywords
                    );
                    program = this.createProgram(this.vertexShader, fragmentShader);
                    this.programs[hash] = program;
                }

                if (program === this.activeProgram) return;

                this.uniforms = this.getUniforms(program);
                this.activeProgram = program;
            },
            bind: () => {
                this.gl.useProgram(this.activeProgram);
            }
        };
    }

    // Program class for shader programs
    Program(vertexShader, fragmentShader) {
        this.uniforms = {};
        this.program = this.createProgram(vertexShader, fragmentShader);
        this.uniforms = this.getUniforms(this.program);

        return {
            program: this.program,
            uniforms: this.uniforms,
            bind: () => {
                this.gl.useProgram(this.program);
            }
        };
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
    createDoubleFBO() {
        const gl = this.gl;
        const ext = this.ext;
        const config = this.config;

        // Create dye texture
        this.dye = this.createDoubleFBO(
            gl,
            ext.formatRGBA.internalFormat,
            ext.formatRGBA.format,