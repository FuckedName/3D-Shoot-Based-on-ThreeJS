class Device
{
    constructor()
    {
        this.keys = [0, 0, 0, 0, 0, 0, 0];
        this.keymap = {
            W: 1, // Key[W]
            A: 2, // Key[A]
            S: 3, // Key[S]
            D: 4, // Key[D]
            c: 9, // KeySpa[c]e
        };
        this.key_up = 1;
        this.key_down = 3;
        this.key_left = 2;
        this.key_right = 4;
        this.key_jump = 9;
        this.mouse_x = 0;
        this.mouse_y = 0;
    }
    
    init()
    {
        //鼠标控制俯仰角和水平偏转
        document.onmousemove = (ev) =>
        {
            this.mouse_x += ev.movementX;
            this.mouse_y += ev.movementY;
        };

        document.onkeydown = (ev) =>
        {
            this.setValue(ev, 1)
        };

        document.onkeyup = (ev) =>
        {
            this.setValue(ev, 0)
        };
    }

    setValue = (ev, value) =>
    {
        let k = this.keymap[ev.code[3]];
        if (k)
        {
            ev.preventDefault();
            this.keys[k] = value;
        }
    }

    reset()
    {
        this.mouse_x = this.mouse_y = 0;
    }
}

class MathSelf //数学库
{
    clamp = (v, min, max) => v < min ? min : (v > max ? max : v);//clamp 的核心含义就是‌把数值限制在最小值和最大值之间‌：小于下限就取下限，大于上限就取上限，在范围内则保持原值。‌
    vec3 = (x = 0, y = 0, z = 0) => ({x, y, z});//初始化
    vec3_rotate_yaw_pitch = (p, yaw, pitch) => mathSelf.vec3_rotate_y(mathSelf.vec3_rotate_x(p, pitch), yaw);//同时绕x，y轴旋转
    vec3_rotate_y = (p, rad) => mathSelf.vec3(p.z * Math.sin(rad) + p.x * Math.cos(rad), p.y, p.z * Math.cos(rad) - p.x * Math.sin(rad));//绕y轴旋转,y坐标不变 x′=xcosθ+zsinθ y′ =y z′ =−xsinθ+zcosθ
    vec3_rotate_x = (p, rad) => mathSelf.vec3(p.x, p.y * Math.cos(rad) - p.z * Math.sin(rad), p.y * Math.sin(rad) + p.z * Math.cos(rad));//绕x轴旋转,x坐标不变 x′ =x  y′ =ycosθ−zsinθ   z′ =ysinθ+zcosθ
    vec3_clone = (a) => mathSelf.vec3(a.x, a.y, a.z);//复制
    vec3_length = (a) => Math.hypot(a.x, a.y, a.z);//Math.hypot()是用于安全计算欧几里得距离（即斜边长度）的函数，数学上等价于 sqrt(x² + y² + ...)
    vec3_add = (a, b) => mathSelf.vec3(a.x + b.x, a.y + b.y, a.z + b.z);//加
    vec3_sub = (a, b) => mathSelf.vec3(a.x - b.x, a.y - b.y, a.z - b.z);//减
    vec3_mul = (a, b) => mathSelf.vec3(a.x * b.x, a.y * b.y, a.z * b.z);//乘积
    vec3_mulf = (a, b) => mathSelf.vec3(a.x * b, a.y * b, a.z * b);//乘积
}

class Render
{
    constructor()
    {
        let displayWidth = 1280;//16
        let displayHeight = 720;//9
        this.scene = new THREE.Scene();//场景
        this.camera = new THREE.PerspectiveCamera(75, displayWidth / displayHeight, 0.1, 1000);// 创建相机
        this.renderer = new THREE.WebGLRenderer(); // 创建渲染器并设置大小
        this.renderer.setSize(displayWidth, displayHeight);
        document.body.appendChild(this.renderer.domElement);
    }

    createLightIntoScene = (x, y, z, color)=>
    {
        const pointLight = new THREE.PointLight(color, 0.78, 2000, 1);
        pointLight.position.set(x, y + 30, z); // 设置光源位置
        this.scene.add(pointLight); // 将光源添加到场景中
        return pointLight;
    }

    createBlockIntoScene = (position, size, color)=>
    {
        // 创建材料（可以是颜色或纹理）
        const material = new THREE.MeshPhongMaterial({ color: color }); // 绿色材料
        const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(position.x + size.x / 2, position.y + size.y / 2, position.z + size.z / 2);//因为默认会把长方体放在坐标中间，所以需要挪动下
        this.scene.add(mesh);
        return mesh;
    }

    render()
    {
        this.renderer.render(this.scene, this.camera); // 使用相机渲染场景
    }
}

//Map会重名
class MapSelf
{
    constructor()
    {
        this.map_size = 128;
        this.collisionMap = new Uint8Array(this.map_size * this.map_size * this.map_size >> 3);//碰撞Map表
    }

    computeCollisionMapIndex = (x, y, z) =>
    {
        return (z * this.map_size * this.map_size + y * this.map_size + x ) >> 3;
    };

    //地图是否有碰撞
    map_block_at = (x, y, z) =>
    {
        let index = this.computeCollisionMapIndex(x, y, z);
        return this.collisionMap[index] & (1 << (x & 7));
    }

    //长方体碰撞检测，这个运算量比较大
    map_block_at_box = (box_start, box_end) =>
    {
        for (let z = box_start.z >> 5; z <= box_end.z >> 5; z++)
            for (let y = box_start.y >> 4; y <= box_end.y >> 4; y++)
                for (let x = box_start.x >> 5; x <= box_end.x >> 5; x++)
                    if (this.map_block_at(x, y, z))
                        return true;

        return false;
    };
}

class Unit
{
    constructor(p, color)
    {
        this.a = mathSelf.vec3(); //加速度
        this.velocity = mathSelf.vec3(); //velocity 速度
        this.position = p;//位置
        this.size = mathSelf.vec3(10, 10, 10); //大小
        this.friction = 0;//friction摩擦力
        this._die_at = 0;//消失或者死亡时间
        this._step_height = 0;//每步移动的高度
        this._bounciness = 0;//弹性
        this._yaw = 0;//沿Y轴偏转角
        this._color = color;//子弹颜色，不同队伍显示颜色不一样，可以很快知道是哪支队伍发出的子弹
        this._pitch = 0;//Pitch（俯仰）‌，表现为‌抬头或低头‌（如飞机机头上下摆动）。
        this._on_ground = 0;//是否在地面，因为不在地面不能跳，在地面才能跳
        this._stepped_up_at = 0; //爬上楼梯后的时间
    }

    //非常核心，单位的移动与碰撞检测
    _update_physics()
    {
        if (this._die_at && this._die_at < global.game_timer)
        {
            return;
        }

        this.a.y = -1200;//因为重力；严重性；地球引力，所以y的速度是向下的，x，z轴是水平的，有可能是子弹平抛，有可能是玩家从高处跳到低处
        let ff = Math.min(this.friction * 0.02, 1);//摩擦力
        this.velocity = mathSelf.vec3_add(
            this.velocity, mathSelf.vec3_sub(
                mathSelf.vec3_mulf(this.a, 0.02),
                mathSelf.vec3_mul(this.velocity, mathSelf.vec3(ff, 0, ff))//只有在x,z轴有摩擦力，y轴是重力
            )
        );

        let
            original_step_height = this._step_height,
            move_dist = mathSelf.vec3_mulf(this.velocity, 0.02),//速度与时间的乘积，位移向量
            steps = Math.ceil(mathSelf.vec3_length(move_dist) / 16),//把位移向量的距离，分成16分，每分多长
            move_step = mathSelf.vec3_mulf(move_dist, 1 / steps);//每一步要走的向量
        for (let s = 0; s < steps; s++)
        {
            let lp = mathSelf.vec3_clone(this.position);//原来的位置
            this.position = mathSelf.vec3_add(this.position, move_step);//如果移动后新的位置

            if (this._collides(mathSelf.vec3(this.position.x, lp.y, lp.z)))//用新的x坐标与老的y，z坐标进行碰撞检测
            {
                if (!this._step_height || !this._on_ground || this.velocity.y > 0 ||
                    this._collides(mathSelf.vec3(this.position.x, lp.y + this._step_height, lp.z)))//如果新的x坐标与老的y+步高，z坐标碰撞检测为真，表示有东西卡住了，则不能上去
                {
                    this._did_collide(0);
                    this.position.x = lp.x;
                    this.velocity.x = -this.velocity.x * this._bounciness;
                }
                else //如果y轴没有碰撞，则表示可以往上走一般是爬楼（因为向x方向走了一小段，并且向y方向走了一小段）
                {
                    lp.y += this._step_height;
                    this._stepped_up_at = global.game_timer;
                }

                s = steps; // stop after this iteration//此迭代后停止
            }

            if (this._collides(mathSelf.vec3(this.position.x, lp.y, this.position.z)))//向x和z方向走了一小段
            {
                if (
                    !this._step_height || !this._on_ground || this.velocity.y > 0 ||
                    this._collides(mathSelf.vec3(this.position.x, lp.y + this._step_height, this.position.z))//再向y方向走了一小段，这里是有碰撞
                )
                {
                    this._did_collide(2);
                    this.position.z = lp.z;
                    this.velocity.z = -this.velocity.z * this._bounciness;
                }
                else //这里是没有碰撞
                {
                    lp.y += this._step_height;
                    this._stepped_up_at = global.game_timer;
                }
                s = steps; // stop after this iteration
            }

            if (this._collides(this.position))//这城是三个方向都移动了一小段，并且有碰撞
            {
                this._did_collide(1);
                this.position.y = lp.y;//因为有碰撞，则回到原来的位置
                let bounce = Math.abs(this.velocity.y) > 200 ? this._bounciness : 0;
                this._on_ground = this.velocity.y < 0 && !bounce;
                this.velocity.y = -this.velocity.y * bounce;
                s = steps; // stop after this iteration
            }

            this._step_height = original_step_height;
        }
    }

    /**
     * 碰撞检测
     * @param p
     * @returns {boolean}
     */
    _collides(p)
    {
        if (this._on_ground &&
            !mapSelf.map_block_at(p.x >> 5, (p.y - this.size.y - 8) >> 4, p.z >> 5) &&
            !mapSelf.map_block_at(p.x >> 5, (p.y - this.size.y - 24) >> 4, p.z >> 5))
        {
            return true;
        }

        return mapSelf.map_block_at_box(mathSelf.vec3_sub(p, this.size), mathSelf.vec3_add(p, this.size));
    }

    _did_collide(axis)//axis: 轴
    {
        if (axis !== 1 || this.velocity.y < -128) //axis == 1是y轴
        {
            this._yaw += Math.random();
        }
    }
}

class Player extends Unit
{
    constructor(p, color)
    {
        super(p, color);
        this.size = mathSelf.vec3(5, 30, 5);
        this.friction = 10;
        this._speed = 1000;
        this._step_height = 17;
        this._can_jump = 0;
        this._fire_interval = 50;//子弹发射间隔
        this._projectile_offset = mathSelf.vec3(0, 0, 8);
        this._projectile_speed = 1900;//子弹发射速度
        this._bullets = [];
        this._cube = render.createBlockIntoScene(p, mathSelf.vec3(5, 30, 5), color);
        this._light = render.createLightIntoScene(p.x, p.y, p.z,0xffffff);
    }

    //比如，移动，视角俯仰角、左右偏转角有变化
    _update()
    {
        let p = this.position;
        this._light.position.set(p.x, p.y + 30, p.z); // 设置光源位置
        this._cube.position.set(p.x, p.y, p.z);

        this._pitch = mathSelf.clamp(this._pitch + device.mouse_y * 10 * (0.00015), -1.5, 1.5);
        this._yaw = (this._yaw - device.mouse_x * 10 * 0.00015) % (Math.PI * 2);

        //运动方向上的加速度
        this.a = mathSelf.vec3_mulf(
            mathSelf.vec3_rotate_y(
                mathSelf.vec3(
                    device.keys[device.key_left] - device.keys[device.key_right],
                    0,
                    device.keys[device.key_up] - device.keys[device.key_down]
                ),
                this._yaw
            ),
            this._speed * (this._on_ground ? 1 : 0.3)
        );

        //如果跳跃键被按下，并且当前在地面上（在空中不能跳跃），并且能跳跃
        if (device.keys[device.key_jump] && this._on_ground && this._can_jump)
        {
            this.velocity.y = 400;
            this._on_ground = 0;
            this._can_jump = 0;
        }
        if (!device.keys[device.key_jump])
        {
            this._can_jump = 1;
        }

        if (global.game_timer % this._fire_interval === 0)
        {
            console.log("this._bullets.length: " + this._bullets.length + ", Player fire.....");
            this.fire(this._yaw + (Math.random() - 0.5) * 0.02, this._pitch + (Math.random() - 0.5) * 0.02);
        }

        //距离上次发射子弹后过了发射间隔的时间
        this.friction = this._on_ground ? 10 : 2.5;
        this._update_physics();

        //平稳地踏上楼梯
        let r_camera_y = this.position.y + 8 - mathSelf.clamp((global.game_timer - this._stepped_up_at) / 100, 0, 0.1) * -160;
        render.camera.position.set(this.position.x, r_camera_y, this.position.z);
        render.camera.rotation.set(this._pitch, this._yaw + Math.PI, 0);
    }

    //发射子弹，当前玩家位置，偏转角，俯仰角，玩家，这里带上玩家，是因为有时候子弹不能打自己人，比如不同队伍玩家子弹的颜色不一样等等
    fire(yaw, pitch)
    {
        let offset = mathSelf.vec3_add(
            mathSelf.vec3(0, 12, 0),
            mathSelf.vec3_rotate_yaw_pitch(
                this._projectile_offset,
                yaw, pitch
            )
        );

        let projectile = new Bullet( mathSelf.vec3_add(this.position, offset), this._color);
        projectile.velocity = mathSelf.vec3_rotate_yaw_pitch(mathSelf.vec3(0, 0, this._projectile_speed),yaw, pitch);
        projectile._yaw = yaw - Math.PI / 2;
        projectile._pitch = -pitch;
        this._bullets.push(projectile);
    }
}

//子弹类型
class Bullet extends Unit
{
    constructor(p, color)
    {
        super(p, color);
        this._die_at = global.game_timer + 300;
        this._bounciness = 0.5;
        this._cube = render.createBlockIntoScene(p, mathSelf.vec3(10, 10, 10), color);
    }

    _update()
    {
        super._update_physics();
        let p = this.position;
        this._cube.position.set(p.x, p.y, p.z);//更新cube的位置
        this.friction = this._on_ground ? 5 : 0.5;
    }
}

class Global
{
    constructor()
    {
        this.game_timer = 0;
    }

    game_load = () =>
    {
        this.map_load();
        device.init();
        this.player = new Player(mathSelf.vec3(708.2 , 424.239, 1444.2), 0xff0000); //队伍0
        this.player._yaw = Math.PI * (0.2 * Math.random()) ;
        requestAnimationFrame(this.game_run);
    };

    map_load =  () =>
    {
        for (let j = 0; j < map_blocks.length; j++)
        {
            let block = map_blocks[j];
            let  x = block.x, y = block.y, z = block.z, sx = block.sx, sy = block.sy, sz = block.sz;
            let cube = render.createBlockIntoScene(mathSelf.vec3(x << 5, y << 4, z << 5), mathSelf.vec3(sx << 5, sy << 4, sz << 5), 0xD3DD05);
            render.scene.add(cube); // 将立方体添加到场景中，这里就是添加地图的很多长方体

            for (let cz = z; cz < z + sz; cz++)
                for (let cy = y; cy < y + sy; cy++)
                    for (let cx = x; cx < x + sx; cx++)
                        mapSelf.collisionMap[mapSelf.computeCollisionMapIndex(cx, cy, cz)] |= 1 << (cx & 7);
        }
    };

    game_run = () =>
    {
        this.game_timer++;
        this.player._update()//如果键盘鼠标有输入，则需要移动玩家
        for (let i = 0; i < this.player._bullets.length; i++)
        {
            this.player._bullets[i]._update();//子弹自己会移动//更新子弹状态
        }

        render.render(); // 使用相机渲染场景
        device.reset() //复位设备状态
        requestAnimationFrame(this.game_run);
    };
}

let mathSelf = new MathSelf();
let mapSelf = new MapSelf();
let device = new Device();
let render = new Render();
let global = new Global();
global.game_load();