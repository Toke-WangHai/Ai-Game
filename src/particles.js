    (function(){
        const canvas = document.getElementById('particleCanvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let particles = [];
        const maxParticles = 35;

        function resize(){
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }
        resize();
        window.addEventListener('resize', resize);

        function createParticle(){
            return {
                x: Math.random() * canvas.width,
                y: canvas.height + 10,
                size: Math.random() * 2.5 + 0.5,
                speedY: -(Math.random() * 0.4 + 0.15),
                speedX: (Math.random() - 0.5) * 0.3,
                opacity: Math.random() * 0.5 + 0.1,
                hue: Math.random() < 0.6 ? (35 + Math.random() * 15) : (200 + Math.random() * 30),
                life: 0,
                maxLife: 300 + Math.random() * 400
            };
        }

        function animate(){
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Add new particles
            if (particles.length < maxParticles && Math.random() < 0.08) {
                particles.push(createParticle());
            }

            particles.forEach((p, i) => {
                p.x += p.speedX + Math.sin(p.life * 0.01) * 0.2;
                p.y += p.speedY;
                p.life++;

                // Fade in/out
                let alpha = p.opacity;
                if (p.life < 40) alpha *= (p.life / 40);
                if (p.life > p.maxLife - 60) alpha *= ((p.maxLife - p.life) / 60);

                if (p.life >= p.maxLife || p.y < -20) {
                    particles.splice(i, 1);
                    return;
                }

                // Draw glow
                const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 4);
                gradient.addColorStop(0, `hsla(${p.hue}, 60%, 70%, ${alpha * 0.6})`);
                gradient.addColorStop(0.4, `hsla(${p.hue}, 50%, 60%, ${alpha * 0.2})`);
                gradient.addColorStop(1, `hsla(${p.hue}, 40%, 50%, 0)`);
                
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * 4, 0, Math.PI * 2);
                ctx.fillStyle = gradient;
                ctx.fill();

                // Draw core
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * 0.6, 0, Math.PI * 2);
                ctx.fillStyle = `hsla(${p.hue}, 70%, 80%, ${alpha * 0.9})`;
                ctx.fill();
            });

            requestAnimationFrame(animate);
        }
        animate();
    })();
