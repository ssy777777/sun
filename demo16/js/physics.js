/* 极简 2D 刚体物理引擎（圆 + 可旋转矩形），供愤怒的小鸟使用。
 * 结构参考经典冲量引擎（circle / polygon SAT + 冲量求解 + 位置修正）。 */
(function () {
    'use strict';

    function V(x, y) { return { x: x, y: y }; }
    function add(a, b) { return { x: a.x + b.x, y: a.y + b.y }; }
    function sub(a, b) { return { x: a.x - b.x, y: a.y - b.y }; }
    function mul(a, s) { return { x: a.x * s, y: a.y * s }; }
    function neg(a) { return { x: -a.x, y: -a.y }; }
    function dot(a, b) { return a.x * b.x + a.y * b.y; }
    function crossVS(v, s) { return { x: -s * v.y, y: s * v.x }; }
    function len(a) { return Math.sqrt(a.x * a.x + a.y * a.y); }
    function norm(a) { var l = len(a); return l > 1e-9 ? { x: a.x / l, y: a.y / l } : { x: 0, y: 0 }; }
    function rot(v, ang) { var c = Math.cos(ang), s = Math.sin(ang); return { x: v.x * c - v.y * s, y: v.x * s + v.y * c }; }
    function rotT(v, ang) { var c = Math.cos(ang), s = Math.sin(ang); return { x: v.x * c + v.y * s, y: -v.x * s + v.y * c }; }

    var EPS = 1e-6;

    function Circle(radius) { return { type: 'circle', radius: radius }; }

    function Box(w, h) {
        var hw = w / 2, hh = h / 2;
        var verts = [V(-hw, -hh), V(hw, -hh), V(hw, hh), V(-hw, hh)];
        var norms = [];
        for (var i = 0; i < 4; i++) {
            var e = sub(verts[(i + 1) % 4], verts[i]);
            norms.push(norm(V(e.y, -e.x)));
        }
        return { type: 'poly', vertices: verts, normals: norms, width: w, height: h };
    }

    function Body(opt) {
        this.shape = opt.shape;
        this.position = opt.position || V(0, 0);
        this.velocity = opt.velocity || V(0, 0);
        this.angle = opt.angle || 0;
        this.angularVelocity = opt.angularVelocity || 0;
        this.force = V(0, 0);
        this.torque = 0;
        this.restitution = opt.restitution !== undefined ? opt.restitution : 0.12;
        this.friction = opt.friction !== undefined ? opt.friction : 0.5;
        this.density = opt.density !== undefined ? opt.density : 1;
        this.staticBody = !!opt.static;
        this.sensor = !!opt.sensor;
        this.data = opt.data || {};
        this.computeMass();
    }
    Body.prototype.computeMass = function () {
        if (this.staticBody) { this.mass = 0; this.invMass = 0; this.inertia = 0; this.invInertia = 0; return; }
        var s = this.shape;
        if (s.type === 'circle') {
            var r = s.radius;
            this.mass = this.density * Math.PI * r * r;
            this.inertia = this.mass * r * r * 0.5;
        } else {
            var w = s.width, h = s.height;
            this.mass = this.density * w * h;
            this.inertia = this.mass * (w * w + h * h) / 12;
        }
        this.invMass = this.mass ? 1 / this.mass : 0;
        this.invInertia = this.inertia ? 1 / this.inertia : 0;
    };
    Body.prototype.applyImpulse = function (imp, rc) {
        if (this.invMass === 0) return;
        this.velocity = add(this.velocity, mul(imp, this.invMass));
        this.angularVelocity += this.invInertia * (rc.x * imp.y - rc.y * imp.x);
    };
    Body.prototype.contains = function (p) {
        var lp = rotT(sub(p, this.position), this.angle);
        if (this.shape.type === 'circle') return dot(lp, lp) <= this.shape.radius * this.shape.radius;
        return Math.abs(lp.x) <= this.shape.width / 2 && Math.abs(lp.y) <= this.shape.height / 2;
    };

    function Manifold(a, b) {
        this.a = a; this.b = b;
        this.normal = V(0, 0);
        this.penetration = 0;
        this.contacts = [V(0, 0), V(0, 0)];
        this.contactCount = 0;
        this.e = 0; this.sf = 0; this.df = 0;
    }

    function support(poly, dir) {
        var best = -Infinity, bestV = poly.vertices[0];
        for (var i = 0; i < poly.vertices.length; i++) {
            var d = dot(poly.vertices[i], dir);
            if (d > best) { best = d; bestV = poly.vertices[i]; }
        }
        return bestV;
    }

    function circleCircle(m, a, b) {
        var d = sub(b.position, a.position);
        var r = a.shape.radius + b.shape.radius;
        var d2 = dot(d, d);
        if (d2 >= r * r) return false;
        var dist = Math.sqrt(d2);
        m.penetration = r - dist;
        m.normal = dist > EPS ? mul(d, 1 / dist) : V(1, 0);
        m.contacts[0] = add(a.position, mul(m.normal, a.shape.radius));
        m.contactCount = 1;
        return true;
    }

    function circlePoly(m, cb, pb) {
        var A = cb.shape, B = pb.shape;
        var center = rotT(sub(cb.position, pb.position), pb.angle);
        var separation = -Infinity, face = 0, i;
        for (i = 0; i < B.normals.length; i++) {
            var s = dot(B.normals[i], sub(center, B.vertices[i]));
            if (s > A.radius) return false;
            if (s > separation) { separation = s; face = i; }
        }
        var v1 = B.vertices[face], v2 = B.vertices[(face + 1) % B.vertices.length];
        m.penetration = A.radius - separation;
        if (separation < EPS) {
            m.contactCount = 1;
            m.normal = neg(rot(B.normals[face], pb.angle));
            m.contacts[0] = add(cb.position, mul(m.normal, A.radius));
            return true;
        }
        var d1 = dot(sub(center, v1), sub(v2, v1));
        var d2 = dot(sub(center, v2), sub(v1, v2));
        if (d1 <= 0) {
            var dd = sub(center, v1);
            if (dot(dd, dd) > A.radius * A.radius) return false;
            m.contactCount = 1;
            var n1 = norm(rot(dd, pb.angle));
            m.normal = n1;
            m.contacts[0] = add(rot(v1, pb.angle), pb.position);
        } else if (d2 <= 0) {
            var dd2 = sub(center, v2);
            if (dot(dd2, dd2) > A.radius * A.radius) return false;
            m.contactCount = 1;
            var n2 = norm(rot(dd2, pb.angle));
            m.normal = n2;
            m.contacts[0] = add(rot(v2, pb.angle), pb.position);
        } else {
            var nf = B.normals[face];
            if (dot(sub(center, v1), nf) > A.radius) return false;
            m.contactCount = 1;
            m.normal = neg(rot(nf, pb.angle));
            m.contacts[0] = add(cb.position, mul(m.normal, A.radius));
        }
        return true;
    }

    function findAxisLeastPenetration(A, a, B, b) {
        var best = -Infinity, bestIndex = 0;
        for (var i = 0; i < A.normals.length; i++) {
            var n = rot(A.normals[i], a.angle);
            var nB = rotT(n, b.angle);
            var s = support(B, neg(nB));
            var vA = add(rot(A.vertices[i], a.angle), a.position);
            var vAB = rotT(sub(vA, b.position), b.angle);
            var d = dot(nB, sub(s, vAB));
            if (d > best) { best = d; bestIndex = i; }
        }
        return { penetration: best, face: bestIndex };
    }

    function clipPlane(n, c, face) {
        var out = [];
        var d1 = dot(n, face[0]) - c;
        var d2 = dot(n, face[1]) - c;
        if (d1 <= 0) out.push(face[0]);
        if (d2 <= 0) out.push(face[1]);
        if (d1 * d2 < 0) {
            var t = d1 / (d1 - d2);
            out.push(add(face[0], mul(sub(face[1], face[0]), t)));
        }
        return out;
    }

    function biasGreaterThan(a, b) { return a >= b * 0.95 + a * 0.01; }

    function polyPoly(m, a, b) {
        var A = a.shape, B = b.shape;
        var pa = findAxisLeastPenetration(A, a, B, b);
        if (pa.penetration > 0) return false;
        var pb = findAxisLeastPenetration(B, b, A, a);
        if (pb.penetration > 0) return false;

        var refP, refBody, incP, incBody, refIndex, flip;
        if (biasGreaterThan(pa.penetration, pb.penetration)) {
            refP = A; refBody = a; incP = B; incBody = b; refIndex = pa.face; flip = false;
        } else {
            refP = B; refBody = b; incP = A; incBody = a; refIndex = pb.face; flip = true;
        }

        var refNormal = rot(refP.normals[refIndex], refBody.angle);
        var refV1 = add(rot(refP.vertices[refIndex], refBody.angle), refBody.position);
        var refV2 = add(rot(refP.vertices[(refIndex + 1) % refP.vertices.length], refBody.angle), refBody.position);
        var sideNormal = norm(sub(refV2, refV1));

        var minDot = Infinity, incIndex = 0;
        for (var i = 0; i < incP.normals.length; i++) {
            var d = dot(rot(incP.normals[i], incBody.angle), refNormal);
            if (d < minDot) { minDot = d; incIndex = i; }
        }
        var incV1 = add(rot(incP.vertices[incIndex], incBody.angle), incBody.position);
        var incV2 = add(rot(incP.vertices[(incIndex + 1) % incP.vertices.length], incBody.angle), incBody.position);

        var negSide = -dot(sideNormal, refV1);
        var posSide = dot(sideNormal, refV2);
        var cp = clipPlane(neg(sideNormal), negSide, [incV1, incV2]);
        if (cp.length < 2) return false;
        cp = clipPlane(sideNormal, posSide, cp);
        if (cp.length < 2) return false;

        m.normal = flip ? neg(refNormal) : refNormal;
        var refC = dot(refNormal, refV1);
        m.contactCount = 0;
        var sep = 0;
        for (var k = 0; k < cp.length; k++) {
            var s = dot(refNormal, cp[k]) - refC;
            if (s <= 0 && m.contactCount < 2) {
                m.contacts[m.contactCount++] = cp[k];
                if (s < sep) sep = s;
            }
        }
        m.penetration = -sep;
        return m.contactCount > 0;
    }

    function collide(a, b) {
        var A = a.shape, B = b.shape;
        if (a.sensor || b.sensor) return null;
        var m = new Manifold(a, b);
        if (A.type === 'circle' && B.type === 'circle') { return circleCircle(m, a, b) ? m : null; }
        if (A.type === 'circle' && B.type === 'poly') { return circlePoly(m, a, b) ? m : null; }
        if (A.type === 'poly' && B.type === 'circle') {
            if (!circlePoly(m, b, a)) return null;
            m.normal = neg(m.normal);
            return m;
        }
        return polyPoly(m, a, b) ? m : null;
    }

    function initialize(m) {
        m.e = Math.min(m.a.restitution, m.b.restitution);
        m.sf = Math.sqrt(m.a.friction * m.b.friction);
        m.df = m.sf;
    }

    function solve(m) {
        var a = m.a, b = m.b;
        if (a.invMass + b.invMass === 0) { a.velocity = V(0, 0); b.velocity = V(0, 0); return; }
        for (var i = 0; i < m.contactCount; i++) {
            var ra = sub(m.contacts[i], a.position);
            var rb = sub(m.contacts[i], b.position);
            var rv = sub(add(b.velocity, crossVS(rb, b.angularVelocity)),
                add(a.velocity, crossVS(ra, a.angularVelocity)));
            var contactVel = dot(rv, m.normal);
            if (contactVel > 0) continue;
            var raCn = ra.x * m.normal.y - ra.y * m.normal.x;
            var rbCn = rb.x * m.normal.y - rb.y * m.normal.x;
            var invSum = a.invMass + b.invMass + raCn * raCn * a.invInertia + rbCn * rbCn * b.invInertia;
            if (invSum <= 0) continue;
            var j = -(1 + m.e) * contactVel / invSum / m.contactCount;
            var imp = mul(m.normal, j);
            a.applyImpulse(neg(imp), ra);
            b.applyImpulse(imp, rb);

            rv = sub(add(b.velocity, crossVS(rb, b.angularVelocity)),
                add(a.velocity, crossVS(ra, a.angularVelocity)));
            var t = sub(rv, mul(m.normal, dot(rv, m.normal)));
            t = norm(t);
            var jt = -dot(rv, t) / invSum / m.contactCount;
            if (Math.abs(jt) < EPS) continue;
            if (Math.abs(jt) > j * m.sf) jt = -j * m.sf;
            var timp = mul(t, jt);
            a.applyImpulse(neg(timp), ra);
            b.applyImpulse(timp, rb);
        }
    }

    function correct(m) {
        var a = m.a, b = m.b;
        var k = a.invMass + b.invMass;
        if (k === 0) return;
        var c = mul(m.normal, Math.max(m.penetration - 0.02, 0) / k * 0.6);
        if (!a.staticBody) a.position = sub(a.position, mul(c, a.invMass));
        if (!b.staticBody) b.position = add(b.position, mul(c, b.invMass));
    }

    function World(opt) {
        opt = opt || {};
        this.gravity = V(0, opt.gravity !== undefined ? opt.gravity : 1600);
        this.bodies = [];
        this.iterations = opt.iterations || 8;
        this.contacts = [];
        this.damping = opt.damping !== undefined ? opt.damping : 0.3;
    }
    World.prototype.add = function (body) { this.bodies.push(body); return body; };
    World.prototype.remove = function (body) {
        var i = this.bodies.indexOf(body);
        if (i >= 0) this.bodies.splice(i, 1);
    };
    World.prototype.step = function (dt) {
        var i, j, b;
        var manifolds = [];
        for (i = 0; i < this.bodies.length; i++) {
            for (j = i + 1; j < this.bodies.length; j++) {
                if (this.bodies[i].staticBody && this.bodies[j].staticBody) continue;
                var m = collide(this.bodies[i], this.bodies[j]);
                if (m) { initialize(m); manifolds.push(m); }
            }
        }
        this.contacts = manifolds;

        var damp = Math.max(0, 1 - this.damping * dt);
        for (i = 0; i < this.bodies.length; i++) {
            b = this.bodies[i];
            if (b.staticBody) continue;
            b.velocity = add(b.velocity, mul(add(this.gravity, mul(b.force, b.invMass)), dt));
            b.angularVelocity += b.invInertia * b.torque * dt;
            b.velocity = mul(b.velocity, damp);
            b.angularVelocity *= damp;
        }

        for (var it = 0; it < this.iterations; it++) {
            for (i = 0; i < manifolds.length; i++) solve(manifolds[i]);
        }

        for (i = 0; i < this.bodies.length; i++) {
            b = this.bodies[i];
            if (b.staticBody) continue;
            b.position = add(b.position, mul(b.velocity, dt));
            b.angle += b.angularVelocity * dt;
        }

        for (i = 0; i < manifolds.length; i++) correct(manifolds[i]);

        for (i = 0; i < this.bodies.length; i++) {
            b = this.bodies[i];
            b.force = V(0, 0);
            b.torque = 0;
        }
    };

    window.Physics = {
        V: V, add: add, sub: sub, mul: mul, dot: dot, len: len, norm: norm, rot: rot,
        World: World, Body: Body, Circle: Circle, Box: Box
    };
})();
