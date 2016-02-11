        var set_num = 6

        Number.prototype.map = function(in_min, in_max, out_min, out_max) {
          return (this - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
        };
        fromRgb = function(n) {
          return Math.ceil((parseInt(n).map(0, 255, 0, 1)) * 1000) / 1000;
        };

         /*global libtess */

         var tessy = (function initTesselator() {
             // function called for each vertex of tesselator output
             function vertexCallback(data, polyVertArray) {
                 // console.log(data[0], data[1]);
                 polyVertArray[polyVertArray.length] = data[0];
                 polyVertArray[polyVertArray.length] = data[1];
                 polyVertArray[polyVertArray.length] = currentColor[0];
                 polyVertArray[polyVertArray.length] = currentColor[1];
                 polyVertArray[polyVertArray.length] = currentColor[2];
                 polyVertArray[polyVertArray.length] = 0.4;
  
             }
             function begincallback(type) {
               if (type !== libtess.primitiveType.GL_TRIANGLES) {
                   console.log('expected TRIANGLES but got type: ' + type);
               }
             }
             function errorcallback(errno) {
                 console.log('error callback');
                 console.log('error number: ' + errno);
             }
             // callback for when segments intersect and must be split
             function combinecallback(coords, data, weight) {
                 // console.log('combine callback');
                 return [coords[0], coords[1], coords[2]];
             }
             function edgeCallback(flag) {
                 // don't really care about the flag, but need no-strip/no-fan behavior
                 // console.log('edge flag: ' + flag);
             }

             var tessy = new libtess.GluTesselator();
             // tessy.gluTessProperty(libtess.gluEnum.GLU_TESS_WINDING_RULE, libtess.windingRule.GLU_TESS_WINDING_POSITIVE);
             tessy.gluTessCallback(libtess.gluEnum.GLU_TESS_VERTEX_DATA, vertexCallback);
             tessy.gluTessCallback(libtess.gluEnum.GLU_TESS_BEGIN, begincallback);
             tessy.gluTessCallback(libtess.gluEnum.GLU_TESS_ERROR, errorcallback);
             tessy.gluTessCallback(libtess.gluEnum.GLU_TESS_COMBINE, combinecallback);
             tessy.gluTessCallback(libtess.gluEnum.GLU_TESS_EDGE_FLAG, edgeCallback);

             return tessy;
         })();

        //var leafletMap = L.map('map').setView([-11.486754, -47.526855], 6);
        var leafletMap = L.map('map').setView([50.00, 14.44], 8);

        L.tileLayer("http://{s}.sm.mapstack.stamen.com/(toner-background,$fff[difference],$fff[@23],$fff[hsl-saturation@20],toner-lines[destination-in])/{z}/{x}/{y}.png")
            .addTo(leafletMap);


        glLayer = L.canvasOverlay()
                       .drawing(drawingOnCanvas)
                       .addTo(leafletMap);
        canvas = glLayer.canvas();

        glLayer.canvas.width  = canvas.clientWidth;
        glLayer.canvas.height = canvas.clientHeight;

        gen_offscreen_colors = function(i) {
          var b, g, r;
          r = ((i ) >> 16) & 0xff;
          g = ((i) >> 8) & 0xff;
          b = (i ) & 0xff;
          return [r, g, b];
        };


        var gl = canvas.getContext('experimental-webgl', { antialias: true, preserveDrawingBuffer: true });

        var pixelsToWebGLMatrix = new Float32Array(16);
        var mapMatrix           = new Float32Array(16);

        // -- WebGl setup
        var vertexShader = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vertexShader, document.getElementById('vshader').text);
        gl.compileShader(vertexShader);

        var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fragmentShader, document.getElementById('fshader').text);
        gl.compileShader(fragmentShader);

        // link shaders to create our program
        program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        gl.useProgram(program);

        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
        // gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        //  gl.disable(gl.DEPTH_TEST);
        // ----------------------------
        // look up the locations for the inputs to our shaders.
        var u_matLoc = gl.getUniformLocation(program, "u_matrix");
        gl.aPointSize = gl.getAttribLocation(program, "a_pointSize");
        // Set the matrix to some that makes 1 unit 1 pixel.

        pixelsToWebGLMatrix.set([2 / canvas.width, 0, 0, 0, 0, -2 / canvas.height, 0, 0, 0, 0, 0, 0, -1, 1, 0, 1]);
        gl.viewport(0, 0, canvas.width, canvas.height);

        gl.uniformMatrix4fv(u_matLoc, false, pixelsToWebGLMatrix);

        var currentColor;
        
        verts      = [];
        var verts2 = []
        var start  = new Date();
        var all    = [];
        var numfeatures = data.features.length;
        var lookup = {}
        console.log('start ' +  numfeatures)
        data.features.map(function (b, i) {
          tessy.gluTessNormal(0, 0, 1);
          tessy.gluTessBeginPolygon(verts);
          tessy.gluTessBeginContour();

          _ref = gen_offscreen_colors(i), red = _ref[0], green = _ref[1], blue = _ref[2];

          lookup[red + " " +  green + " " + blue] = b.properties.NAZKR_ENG + " - " + b.properties.NAZEV_ENG

          // lookup[red + " " +  green + " " + blue] = b.properties.admin_1_name + " - " + b.properties.admin_2_name + " " + b.geometry.coordinates[0][0][0] + " " + b.geometry.coordinates[0][0][1]

          currentColor = [fromRgb(red), fromRgb(green), fromRgb(blue)];

          b.geometry.coordinates[0].map(function (d) {
            pixel = LatLongToPixelXY(d[1], d[0],0);
            var coords = [pixel.x, pixel.y, 0];
            tessy.gluTessVertex(coords, coords);
          });
          tessy.gluTessEndContour();
          tessy.gluTessEndPolygon();

          all = verts.concat(all);

          verts = [];
        });
        verts = all;
        verts2 = verts.slice(0) // On screen points

        // Just one color for polygons ononscreen buffer
        verts.map(function (b, i) {
          if(i%set_num==0){
            verts2[i-2] =  0.099
            verts2[i-3] = 0.079
            verts2[i-4] = 0.844
          }
        })

        console.log("updated at  " + new Date().setTime(new Date().getTime() - start.getTime()) + " ms ");        
      
        onVertBuffer  = gl.createBuffer();
        offVertBuffer = gl.createBuffer();

        var onVertArray  = new Float32Array(verts2);
        var offVertArray = new Float32Array(verts);

        var fsize = onVertArray.BYTES_PER_ELEMENT;

        // On screen
        gl.bindBuffer(gl.ARRAY_BUFFER, onVertBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, onVertArray, gl.STATIC_DRAW);


        //Off screen
        gl.bindBuffer(gl.ARRAY_BUFFER, offVertBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, offVertArray, gl.STATIC_DRAW);        

        glLayer.redraw();

        function drawingOnCanvas(canvasOverlay, params) {
            if (gl == null) return;

            gl.clear(gl.COLOR_BUFFER_BIT);

            pixelsToWebGLMatrix.set([2 / canvas.width, 0, 0, 0, 0, -2 / canvas.height, 0, 0, 0, 0, 0, 0, -1, 1, 0, 1]);
            gl.viewport(0, 0, canvas.width, canvas.height);

            var pointSize = Math.max(leafletMap.getZoom() - 4.0, 1.0);
            gl.vertexAttrib1f(gl.aPointSize, pointSize);

            // -- set base matrix to translate canvas pixel coordinates -> webgl coordinates
            mapMatrix.set(pixelsToWebGLMatrix);

            var bounds = leafletMap.getBounds();
            var topLeft = new L.LatLng(bounds.getNorth(), bounds.getWest());
            var offset = LatLongToPixelXY(topLeft.lat, topLeft.lng);

            // -- Scale to current zoom
            var scale = Math.pow(2, leafletMap.getZoom());
            scaleMatrix(mapMatrix, scale, scale);

            translateMatrix(mapMatrix, -offset.x, -offset.y);
            height = 2048;
            width  = 2048;

            var texture

            texture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, texture)
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
        
            // Creating a Renderbuffer to store depth information
            renderbuffer = gl.createRenderbuffer()
            gl.bindRenderbuffer(gl.RENDERBUFFER, renderbuffer)
            gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height)
        
            // Creating a framebuffer for offscreen rendering
            framebuffer = gl.createFramebuffer()
            gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer)
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0)
            gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, renderbuffer)

            // Finally, we do a bit of cleaning up as usual
            gl.bindTexture(gl.TEXTURE_2D, null)
            gl.bindRenderbuffer(gl.RENDERBUFFER, null)
            gl.bindFramebuffer(gl.FRAMEBUFFER, null)

            gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);

            gl.bindBuffer(gl.ARRAY_BUFFER, offVertBuffer)          
            attributeLoc = gl.getAttribLocation(program, "a_vertex")
            gl.enableVertexAttribArray(attributeLoc)
            gl.vertexAttribPointer(attributeLoc, 2, gl.FLOAT, false, 0, 0)


            var vertLoc = gl.getAttribLocation(program, "a_vertex");
            gl.vertexAttribPointer(vertLoc, 2, gl.FLOAT, false, fsize * set_num, 0);
            gl.enableVertexAttribArray(vertLoc);

            // -- offset for color buffer
            var colorLoc = gl.getAttribLocation(program, "a_color");
            gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, fsize * set_num, fsize * 2);
            gl.enableVertexAttribArray(colorLoc);


             l = onVertArray.length / set_num

            gl.uniformMatrix4fv(u_matLoc, false, mapMatrix);
            gl.drawArrays(gl.TRIANGLES, 0, l)
            gl.bindFramebuffer(gl.FRAMEBUFFER, null)

            // On SCREEN
            // Bind Shader attributes

            gl.bindBuffer(gl.ARRAY_BUFFER, onVertBuffer)          
            attributeLoc = gl.getAttribLocation(program, "a_vertex")
            gl.enableVertexAttribArray(attributeLoc)
            gl.vertexAttribPointer(attributeLoc, 2, gl.FLOAT, false, 0, 0)

            var vertLoc = gl.getAttribLocation(program, "a_vertex");
            gl.vertexAttribPointer(vertLoc, 2, gl.FLOAT, false, fsize * set_num, 0);
            gl.enableVertexAttribArray(vertLoc);

            // -- offset for color buffer
            var colorLoc = gl.getAttribLocation(program, "a_color");
            gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, fsize * set_num, fsize * 2);
            gl.enableVertexAttribArray(colorLoc);

            l = onVertArray.length / set_num
            gl.uniformMatrix4fv(u_matLoc, false, mapMatrix);
            gl.drawArrays(gl.TRIANGLES, 0, l)
        }

        canvas.addEventListener('mousemove', function(ev) {
          var infoWindow, left, obj, pixels, top, x, y;
          infoWindow = document.getElementById('infoWindow');
          x = void 0;
          y = void 0;
          top = 0;
          left = 0;
          obj = canvas;
          while (obj && obj.tagName !== "BODY") {
            top += obj.offsetTop;
            left += obj.offsetLeft;
            obj = obj.offsetParent;
          }
          left += pageXOffset;
          top -= pageYOffset;
          x = ev.clientX - left;
          y = canvas.clientHeight - (ev.clientY - top);
          pixels = new Uint8Array(4);
          gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer)              //Load offscreen frame buffer for picking
          gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
          gl.bindFramebuffer(gl.FRAMEBUFFER, null)
           if (lookup[pixels[0] + " " + pixels[1] + " " + pixels[2]] && !!pixels[3]) {

            infoWindow.style.display = "inline";
            infoWindow.style.left = ev.x + 20 + 'px';
            infoWindow.style.top = ev.y - 25 + 'px';
            return infoWindow.innerHTML = lookup[pixels[0] + " " + pixels[1] + " " + pixels[2]];
          } else {
            return infoWindow.style.display = "none";
          }
        });



        // Returns a random integer from 0 to range - 1.
        function randomInt(range) {
            return Math.floor(Math.random() * range);
        }

        function LatLongToPixelXY(latitude, longitude) {
            var pi_180 = Math.PI / 180.0;
            var pi_4 = Math.PI * 4;
            var sinLatitude = Math.sin(latitude * pi_180);
            var pixelY = (0.5 - Math.log((1 + sinLatitude) / (1 - sinLatitude)) / (pi_4)) * 256;
            var pixelX = ((longitude + 180) / 360) * 256;
            var pixel = { x: pixelX, y: pixelY };
            return pixel;
        }

        function translateMatrix(matrix, tx, ty) {
            // translation is in last column of matrix
            matrix[12] += matrix[0] * tx + matrix[4] * ty;
            matrix[13] += matrix[1] * tx + matrix[5] * ty;
            matrix[14] += matrix[2] * tx + matrix[6] * ty;
            matrix[15] += matrix[3] * tx + matrix[7] * ty;
        }

        function scaleMatrix(matrix, scaleX, scaleY) {
            // scaling x and y, which is just scaling first two columns of matrix
            matrix[0] *= scaleX;
            matrix[1] *= scaleX;
            matrix[2] *= scaleX;
            matrix[3] *= scaleX;

            matrix[4] *= scaleY;
            matrix[5] *= scaleY;
            matrix[6] *= scaleY;
            matrix[7] *= scaleY;
        }