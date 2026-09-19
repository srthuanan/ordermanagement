import bpy
import bmesh
import math
import os

OUTPUT_DIR = r"C:\Users\USER\Documents\ordermanagement\public\assets\lanterns"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# 1. Clear all existing scene objects
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete()

# 2. Setup Render Settings
scene = bpy.context.scene
scene.render.resolution_x = 600
scene.render.resolution_y = 900
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGBA'
scene.render.film_transparent = True

# Standard View Transform for 100% true vibrant festive colors (No AgX desaturation!)
scene.view_settings.view_transform = 'Standard'
scene.view_settings.look = 'High Contrast'

if scene.world:
    scene.world.use_nodes = True
    bg = scene.world.node_tree.nodes.get('Background')
    if bg:
        bg.inputs['Color'].default_value = (0, 0, 0, 1)
        bg.inputs['Strength'].default_value = 0.0

# 3. Setup Camera
cam_data = bpy.data.cameras.new("RenderCam")
cam_obj = bpy.data.objects.new("RenderCam", cam_data)
bpy.context.collection.objects.link(cam_obj)
scene.camera = cam_obj
cam_obj.location = (0, -7.0, -0.2)
cam_obj.rotation_euler = (math.radians(90), 0, 0)
cam_data.lens = 55.0

# 4. Soft Moonlight Rim Lighting
rim_light = bpy.data.lights.new("MoonRim", type='SUN')
rim_light.energy = 0.7
rim_light.color = (0.75, 0.85, 1.0)
rim_obj = bpy.data.objects.new("MoonRim", rim_light)
rim_obj.rotation_euler = (math.radians(55), math.radians(20), math.radians(-45))
bpy.context.collection.objects.link(rim_obj)

fill_light = bpy.data.lights.new("SoftFill", type='SUN')
fill_light.energy = 0.3
fill_light.color = (1.0, 0.95, 0.9)
fill_obj = bpy.data.objects.new("SoftFill", fill_light)
fill_obj.rotation_euler = (math.radians(25), math.radians(-15), math.radians(135))
bpy.context.collection.objects.link(fill_obj)

# 5. Core Vibrant Materials Library with Translucent Glow
def create_lantern_mat(name, base_rgb, emiss_rgb, emiss_str=1.1, roughness=0.25):
    mat = bpy.data.materials.get(name)
    if not mat:
        mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    nodes.clear()
    
    out = nodes.new('ShaderNodeOutputMaterial')
    bsdf = nodes.new('ShaderNodeBsdfPrincipled')
    bsdf.inputs['Base Color'].default_value = (*base_rgb, 1.0)
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Metallic'].default_value = 0.0
    
    if 'Emission Color' in bsdf.inputs:
        bsdf.inputs['Emission Color'].default_value = (*emiss_rgb, 1.0)
        bsdf.inputs['Emission Strength'].default_value = emiss_str
    elif 'Emission' in bsdf.inputs:
        bsdf.inputs['Emission'].default_value = (*emiss_rgb, 1.0)
        bsdf.inputs['Emission Strength'].default_value = emiss_str
        
    mat.node_tree.links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])
    return mat

def create_metallic_mat(name, color_rgb, metallic=0.4, roughness=0.25, emiss_rgb=(1.0, 0.82, 0.2), emiss_str=0.45):
    mat = bpy.data.materials.get(name)
    if not mat:
        mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    nodes.clear()
    
    out = nodes.new('ShaderNodeOutputMaterial')
    bsdf = nodes.new('ShaderNodeBsdfPrincipled')
    bsdf.inputs['Base Color'].default_value = (*color_rgb, 1.0)
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Metallic'].default_value = metallic
    if emiss_rgb and 'Emission Color' in bsdf.inputs:
        bsdf.inputs['Emission Color'].default_value = (*emiss_rgb, 1.0)
        bsdf.inputs['Emission Strength'].default_value = emiss_str
    mat.node_tree.links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])
    return mat

# Saturated Vietnamese Mid-Autumn folk colors
mat_vibrant_red = create_lantern_mat("M_VibrantRed", (0.96, 0.0, 0.02), (1.0, 0.02, 0.02), emiss_str=1.0)
mat_vibrant_yellow = create_lantern_mat("M_VibrantYellow", (1.0, 0.85, 0.02), (1.0, 0.88, 0.05), emiss_str=1.05)
mat_vibrant_orange = create_lantern_mat("M_VibrantOrange", (1.0, 0.40, 0.01), (1.0, 0.48, 0.02), emiss_str=1.0)
mat_vibrant_green = create_lantern_mat("M_VibrantGreen", (0.02, 0.85, 0.25), (0.05, 0.95, 0.30), emiss_str=1.0)
mat_vibrant_pink = create_lantern_mat("M_VibrantPink", (1.0, 0.18, 0.65), (1.0, 0.28, 0.72), emiss_str=1.05)
mat_vibrant_purple = create_lantern_mat("M_VibrantPurple", (0.72, 0.10, 0.96), (0.85, 0.20, 1.0), emiss_str=1.0)
mat_vibrant_cyan = create_lantern_mat("M_VibrantCyan", (0.02, 0.78, 0.98), (0.10, 0.88, 1.0), emiss_str=1.0)
mat_warm_white = create_lantern_mat("M_WarmWhite", (1.0, 0.96, 0.85), (1.0, 0.92, 0.75), emiss_str=1.1)

# Shining Gold Foil & Lacquer Wood
mat_gold_foil = create_metallic_mat("M_GoldFoil", (1.0, 0.86, 0.22), metallic=0.4, roughness=0.25, emiss_rgb=(1.0, 0.82, 0.2), emiss_str=0.45)
mat_lacquer_wood = create_metallic_mat("M_LacquerWood", (0.18, 0.02, 0.01), metallic=0.2, roughness=0.25, emiss_rgb=(0.3, 0.05, 0.02), emiss_str=0.1)

def clean_mesh_objects():
    for obj in list(bpy.data.objects):
        if obj.type in ['MESH', 'CURVE', 'LIGHT'] and obj.name not in ["MoonRim", "SoftFill"]:
            bpy.data.objects.remove(obj, do_unlink=True)

def add_interior_candle(loc=(0, 0, 0), energy=20.0, color=(1.0, 0.85, 0.35)):
    l_data = bpy.data.lights.new("InnerCandle", type='POINT')
    l_data.energy = energy
    l_data.color = color
    l_data.shadow_soft_size = 0.5
    l_obj = bpy.data.objects.new("InnerCandle", l_data)
    l_obj.location = loc
    bpy.context.collection.objects.link(l_obj)

def add_standard_tassel(bottom_z, color_mat, length=1.2, num_strands=36):
    bpy.ops.mesh.primitive_cylinder_add(radius=0.20, depth=0.08, location=(0, 0, bottom_z - 0.04))
    bpy.context.active_object.data.materials.append(mat_lacquer_wood)
    
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.09, location=(0, 0, bottom_z - 0.14))
    bpy.context.active_object.data.materials.append(mat_gold_foil)
    
    bpy.ops.mesh.primitive_cone_add(radius1=0.04, radius2=0.12, depth=0.12, location=(0, 0, bottom_z - 0.24))
    bpy.context.active_object.data.materials.append(mat_gold_foil)
    
    cap_r = 0.11
    start_z = bottom_z - 0.28
    for s in range(num_strands):
        phi = s * (2 * math.pi / num_strands)
        x0 = cap_r * math.cos(phi)
        y0 = cap_r * math.sin(phi)
        
        c_data = bpy.data.curves.new(f"Strand_{s}", type='CURVE')
        c_data.dimensions = '3D'; c_data.bevel_depth = 0.007; c_data.bevel_resolution = 2
        spline = c_data.splines.new('BEZIER')
        spline.bezier_points.add(2)
        
        p0 = spline.bezier_points[0]
        p0.co = (x0, y0, start_z)
        p0.handle_right = (x0, y0, start_z - 0.2)
        p0.handle_left = (x0, y0, start_z + 0.05)
        
        x_mid = (cap_r * 0.6) * math.cos(phi)
        y_mid = (cap_r * 0.6) * math.sin(phi)
        p1 = spline.bezier_points[1]
        p1.co = (x_mid, y_mid, start_z - length * 0.5)
        p1.handle_left = (x_mid, y_mid, start_z - length * 0.3)
        p1.handle_right = (x_mid, y_mid, start_z - length * 0.7)
        
        x_end = (cap_r * 0.85) * math.cos(phi)
        y_end = (cap_r * 0.85) * math.sin(phi)
        p2 = spline.bezier_points[2]
        p2.co = (x_end, y_end, start_z - length)
        p2.handle_left = (x_end, y_end, start_z - length * 0.85)
        p2.handle_right = (x_end, y_end, start_z - length - 0.05)
        
        sobj = bpy.data.objects.new(f"Strand_{s}", c_data)
        bpy.context.collection.objects.link(sobj)
        sobj.data.materials.append(color_mat)

def add_top_hanger(top_z):
    bpy.ops.mesh.primitive_cylinder_add(radius=0.22, depth=0.08, location=(0, 0, top_z + 0.04))
    bpy.context.active_object.data.materials.append(mat_lacquer_wood)
    bpy.ops.mesh.primitive_torus_add(major_radius=0.10, minor_radius=0.022, location=(0, 0, top_z + 0.16), rotation=(math.pi/2, 0, 0))
    bpy.context.active_object.data.materials.append(mat_gold_foil)

def render_lantern(idx, cam_z=-0.3, cam_dist=6.8):
    cam_obj.location = (0, -cam_dist, cam_z)
    scene.render.filepath = os.path.join(OUTPUT_DIR, f"lantern_{idx}.png")
    bpy.ops.render.render(write_still=True)
    print(f"Rendered lantern_{idx}.png")

# ==============================================================================
# 16 VIBRANT MID-AUTUMN FOLK LANTERNS
# ==============================================================================

# 1. Đại đăng quả trám gấm đỏ thêu hoa
def build_lantern_1():
    clean_mesh_objects()
    height = 2.4; r_max = 1.15
    bm = bmesh.new()
    rings, ribs = 24, 16
    grid = []
    for i in range(rings + 1):
        t = i / rings; z = (t - 0.5) * height
        prof = math.sin(t * math.pi) ** 0.85
        r = 0.22 + r_max * prof
        r_verts = []
        for j in range(ribs):
            a = j * 2 * math.pi / ribs
            r_verts.append(bm.verts.new((r * math.cos(a), r * math.sin(a), z)))
        grid.append(r_verts)
    for i in range(rings):
        for j in range(ribs):
            bm.faces.new((grid[i][j], grid[i][(j+1)%ribs], grid[i+1][(j+1)%ribs], grid[i+1][j]))
    mesh = bpy.data.meshes.new("L1_Mesh")
    bm.to_mesh(mesh); bm.free()
    obj = bpy.data.objects.new("L1_Body", mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat_vibrant_red)
    for p in mesh.polygons: p.use_smooth = True
    
    # 16 Golden ribs
    for j in range(ribs):
        a = j * 2 * math.pi / ribs
        c_data = bpy.data.curves.new(f"L1_Rib_{j}", 'CURVE')
        c_data.dimensions = '3D'; c_data.bevel_depth = 0.018
        spline = c_data.splines.new('POLY')
        spline.points.add(rings)
        for i in range(rings + 1):
            t = i / rings; z = (t - 0.5) * height
            r = (0.22 + r_max * (math.sin(t * math.pi) ** 0.85)) * 1.01
            spline.points[i].co = (r * math.cos(a), r * math.sin(a), z, 1.0)
        robj = bpy.data.objects.new(f"L1_Rib_{j}", c_data)
        bpy.context.collection.objects.link(robj)
        robj.data.materials.append(mat_gold_foil)
        
    add_interior_candle((0, 0, 0), energy=22.0)
    add_top_hanger(height / 2)
    add_standard_tassel(-height / 2, mat_vibrant_red, length=1.3)
    render_lantern(1, cam_z=-0.4, cam_dist=7.0)

# 2. Đèn ông sao 5 cánh cổ truyền
def build_lantern_2():
    clean_mesh_objects()
    bm = bmesh.new()
    outer_r = 1.35; inner_r = 0.55; depth = 0.35
    center_front = bm.verts.new((0, depth, 0))
    center_back = bm.verts.new((0, -depth, 0))
    rim_verts = []
    for i in range(10):
        a = i * (math.pi / 5) + math.pi / 2
        r = outer_r if (i % 2 == 0) else inner_r
        rim_verts.append(bm.verts.new((r * math.cos(a), 0, r * math.sin(a))))
    for i in range(10):
        v1 = rim_verts[i]
        v2 = rim_verts[(i + 1) % 10]
        bm.faces.new((center_front, v1, v2))
        bm.faces.new((center_back, v2, v1))
    mesh = bpy.data.meshes.new("L2_Star")
    bm.to_mesh(mesh); bm.free()
    star_obj = bpy.data.objects.new("L2_Star", mesh)
    bpy.context.collection.objects.link(star_obj)
    star_obj.data.materials.append(mat_vibrant_red)
    
    # 5 golden spines running along star points
    for i in range(5):
        a = i * (2 * math.pi / 5) + math.pi / 2
        c_data = bpy.data.curves.new(f"Spine_{i}", 'CURVE')
        c_data.dimensions = '3D'; c_data.bevel_depth = 0.016
        spline = c_data.splines.new('POLY')
        spline.points.add(1)
        spline.points[0].co = (0, depth * 1.02, 0, 1.0)
        spline.points[1].co = (outer_r * math.cos(a), 0, outer_r * math.sin(a), 1.0)
        sp_obj = bpy.data.objects.new(f"Spine_{i}", c_data)
        bpy.context.collection.objects.link(sp_obj)
        sp_obj.data.materials.append(mat_gold_foil)
        
    # Outer emerald green bamboo ring
    bpy.ops.mesh.primitive_torus_add(major_radius=0.95, minor_radius=0.038, location=(0, 0, 0), rotation=(math.pi/2, 0, 0))
    bpy.context.active_object.data.materials.append(mat_vibrant_green)
    
    # Glowing golden sun disk in center
    bpy.ops.mesh.primitive_cylinder_add(radius=0.42, depth=depth*2 + 0.03, location=(0, 0, 0), rotation=(math.pi/2, 0, 0))
    bpy.context.active_object.data.materials.append(mat_vibrant_yellow)
    
    add_interior_candle((0, 0, 0), energy=22.0)
    add_top_hanger(outer_r)
    add_standard_tassel(-inner_r * 0.9, mat_vibrant_yellow, length=1.2)
    render_lantern(2, cam_z=-0.1, cam_dist=6.5)

# 3. Đèn cá chép trông trăng (Đỏ cam & vây vàng óng)
def build_lantern_3():
    clean_mesh_objects()
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.78, location=(0.15, 0, 0))
    fish = bpy.context.active_object
    fish.scale = (1.5, 0.55, 0.75)
    fish.rotation_euler = (0, math.radians(-15), 0)
    fish.data.materials.append(mat_vibrant_orange)
    for p in fish.data.polygons: p.use_smooth = True
    
    # Scarlet red head
    bpy.ops.mesh.primitive_cone_add(radius1=0.46, radius2=0.1, depth=0.6, location=(-0.9, 0, 0.25), rotation=(0, -math.pi/2, 0))
    bpy.context.active_object.data.materials.append(mat_vibrant_red)
    
    # Gold scale hoops
    for x_pos in [-0.2, 0.2, 0.6]:
        bpy.ops.mesh.primitive_torus_add(major_radius=0.42, minor_radius=0.02, location=(x_pos, 0, 0.05), rotation=(0, math.pi/2, 0))
        bpy.context.active_object.data.materials.append(mat_gold_foil)
        
    # Sparkling golden eyes & whiskers
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.09, location=(-0.85, -0.32, 0.35))
    bpy.context.active_object.data.materials.append(mat_gold_foil)
    
    # Glowing canary-yellow dorsal fin
    bpy.ops.mesh.primitive_cylinder_add(radius=0.45, depth=0.05, location=(0.1, 0, 0.68), rotation=(math.pi/2, 0, 0))
    fin = bpy.context.active_object
    fin.scale = (1.0, 0.35, 1.0)
    fin.data.materials.append(mat_vibrant_yellow)
    
    # Fan tail
    bpy.ops.mesh.primitive_cone_add(radius1=0.75, radius2=0.1, depth=0.9, location=(1.15, 0, -0.2), rotation=(0, math.radians(65), 0))
    tail = bpy.context.active_object
    tail.scale = (0.25, 0.85, 1.0)
    tail.data.materials.append(mat_vibrant_yellow)
    
    add_interior_candle((0.1, 0, 0.1), energy=20.0)
    add_top_hanger(0.72)
    add_standard_tassel(-0.62, mat_vibrant_red, length=1.2)
    render_lantern(3, cam_z=-0.1, cam_dist=6.5)

# 4. Đèn kéo quân lục giác hoàng cung
def build_lantern_4():
    clean_mesh_objects()
    bpy.ops.mesh.primitive_cylinder_add(vertices=6, radius=0.9, depth=1.5, location=(0, 0, 0))
    body = bpy.context.active_object
    body.data.materials.append(mat_vibrant_yellow)
    
    # Red lacquer pavilion roof
    bpy.ops.mesh.primitive_cone_add(vertices=6, radius1=1.28, radius2=0.2, depth=0.55, location=(0, 0, 1.02))
    bpy.context.active_object.data.materials.append(mat_vibrant_red)
    
    # Bottom tier
    bpy.ops.mesh.primitive_cylinder_add(vertices=6, radius=0.98, depth=0.15, location=(0, 0, -0.8))
    bpy.context.active_object.data.materials.append(mat_lacquer_wood)
    
    # 6 Gold pillars
    for i in range(6):
        a = i * math.pi / 3
        x = 0.9 * math.cos(a); y = 0.9 * math.sin(a)
        bpy.ops.mesh.primitive_cylinder_add(radius=0.045, depth=1.6, location=(x, y, 0))
        bpy.context.active_object.data.materials.append(mat_gold_foil)
        
    add_interior_candle((0, 0, 0), energy=24.0)
    add_top_hanger(1.28)
    add_standard_tassel(-0.9, mat_vibrant_red, length=1.2)
    render_lantern(4, cam_z=-0.1, cam_dist=6.8)

# 5. Đèn thỏ ngọc cung trăng
def build_lantern_5():
    clean_mesh_objects()
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.88, location=(0.15, 0, 0))
    body = bpy.context.active_object
    body.scale = (1.2, 0.85, 0.9)
    body.data.materials.append(mat_warm_white)
    for p in body.data.polygons: p.use_smooth = True
    
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.56, location=(-0.75, 0, 0.45))
    head = bpy.context.active_object
    head.data.materials.append(mat_warm_white)
    for p in head.data.polygons: p.use_smooth = True
    
    for side in [-1, 1]:
        bpy.ops.mesh.primitive_cylinder_add(radius=0.13, depth=0.88, location=(-0.75, side * 0.16, 1.18), rotation=(0, math.radians(10), side * math.radians(12)))
        ear = bpy.context.active_object
        ear.scale = (0.7, 0.35, 1.0)
        ear.data.materials.append(mat_vibrant_pink)
        for p in ear.data.polygons: p.use_smooth = True
        
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.08, location=(-1.12, -0.28, 0.55))
    bpy.context.active_object.data.materials.append(mat_vibrant_red)
    
    for side in [-1, 1]:
        bpy.ops.mesh.primitive_torus_add(major_radius=0.28, minor_radius=0.035, location=(0, side * 0.55, -0.65), rotation=(math.pi/2, 0, 0))
        bpy.context.active_object.data.materials.append(mat_gold_foil)
        
    add_interior_candle((0, 0, 0.1), energy=20.0)
    add_top_hanger(1.15)
    add_standard_tassel(-0.72, mat_vibrant_pink, length=1.2)
    render_lantern(5, cam_z=-0.1, cam_dist=6.8)

# 6. Đèn cánh bướm dạ quang
def build_lantern_6():
    clean_mesh_objects()
    bpy.ops.mesh.primitive_cylinder_add(radius=0.12, depth=1.5, location=(0, 0, 0.1))
    body = bpy.context.active_object
    body.data.materials.append(mat_gold_foil)
    
    for side in [-1, 1]:
        bpy.ops.mesh.primitive_cylinder_add(radius=0.78, depth=0.05, location=(side * 0.78, 0, 0.48), rotation=(math.pi/2, 0, side * math.radians(15)))
        w1 = bpy.context.active_object
        w1.scale = (1.2, 0.9, 1.0)
        w1.data.materials.append(mat_vibrant_purple)
        
        bpy.ops.mesh.primitive_cylinder_add(radius=0.25, depth=0.06, location=(side * 0.85, 0, 0.55), rotation=(math.pi/2, 0, 0))
        sp = bpy.context.active_object
        sp.data.materials.append(mat_vibrant_yellow)
        
        bpy.ops.mesh.primitive_cylinder_add(radius=0.58, depth=0.05, location=(side * 0.6, 0, -0.35), rotation=(math.pi/2, 0, -side * math.radians(20)))
        w2 = bpy.context.active_object
        w2.scale = (1.1, 0.8, 1.0)
        w2.data.materials.append(mat_vibrant_orange)
        
    for side in [-1, 1]:
        bpy.ops.mesh.primitive_cylinder_add(radius=0.02, depth=0.5, location=(side * 0.15, 0, 1.0), rotation=(0, side * math.radians(25), 0))
        bpy.context.active_object.data.materials.append(mat_gold_foil)
        
    add_interior_candle((0, 0, 0.2), energy=20.0)
    add_top_hanger(0.85)
    add_standard_tassel(-0.65, mat_vibrant_purple, length=1.2)
    render_lantern(6, cam_z=-0.1, cam_dist=6.5)

# 7. Đèn quả lựu phú quý
def build_lantern_7():
    clean_mesh_objects()
    bpy.ops.mesh.primitive_uv_sphere_add(radius=1.05, location=(0, 0, 0))
    pom = bpy.context.active_object
    pom.scale = (1.1, 1.1, 0.95)
    pom.data.materials.append(mat_vibrant_red)
    for p in pom.data.polygons: p.use_smooth = True
    
    for j in range(8):
        a = j * math.pi / 4
        c_data = bpy.data.curves.new(f"PomRib_{j}", 'CURVE')
        c_data.dimensions = '3D'; c_data.bevel_depth = 0.015
        spline = c_data.splines.new('POLY')
        spline.points.add(10)
        for i in range(11):
            t = i / 10; z = (t - 0.5) * 1.9
            r = 1.06 * math.cos((t - 0.5) * math.pi * 0.95)
            spline.points[i].co = (r * math.cos(a), r * math.sin(a), z, 1.0)
        robj = bpy.data.objects.new(f"PomRib_{j}", c_data)
        bpy.context.collection.objects.link(robj)
        robj.data.materials.append(mat_gold_foil)
        
    bpy.ops.mesh.primitive_cone_add(radius1=0.2, radius2=0.48, depth=0.38, location=(0, 0, 1.05))
    bpy.context.active_object.data.materials.append(mat_gold_foil)
    
    bpy.ops.mesh.primitive_cylinder_add(radius=0.38, depth=0.05, location=(0.38, 0, 0.98), rotation=(math.radians(20), math.radians(45), 0))
    bpy.context.active_object.data.materials.append(mat_vibrant_green)
    
    add_interior_candle((0, 0, 0), energy=22.0)
    add_top_hanger(1.24)
    add_standard_tassel(-0.95, mat_vibrant_red, length=1.2)
    render_lantern(7, cam_z=-0.1, cam_dist=6.8)

# 8. Đèn hoa cúc trăng tròn
def build_lantern_8():
    clean_mesh_objects()
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.88, location=(0, 0, 0))
    core = bpy.context.active_object
    core.data.materials.append(mat_vibrant_yellow)
    for p in core.data.polygons: p.use_smooth = True
    
    num_petals = 16
    for i in range(num_petals):
        a = i * 2 * math.pi / num_petals
        x = 0.92 * math.cos(a); y = 0.92 * math.sin(a)
        bpy.ops.mesh.primitive_cone_add(radius1=0.18, radius2=0.03, depth=0.55, location=(x, y, 0), rotation=(0, math.pi/2, a))
        p_obj = bpy.context.active_object
        p_obj.data.materials.append(mat_vibrant_orange if i % 2 == 0 else mat_vibrant_yellow)
        
    add_interior_candle((0, 0, 0), energy=22.0)
    add_top_hanger(0.92)
    add_standard_tassel(-0.88, mat_vibrant_yellow, length=1.2)
    render_lantern(8, cam_z=-0.1, cam_dist=6.8)

# 9. Đèn hoa đăng bát giác
def build_lantern_9():
    clean_mesh_objects()
    bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=1.05, depth=0.22, location=(0, 0, -0.3))
    base = bpy.context.active_object
    base.data.materials.append(mat_vibrant_green)
    
    for i in range(8):
        a = i * math.pi / 4
        x = 0.88 * math.cos(a); y = 0.88 * math.sin(a)
        bpy.ops.mesh.primitive_cone_add(radius1=0.42, radius2=0.05, depth=0.75, location=(x, y, 0.1), rotation=(math.radians(25) * math.sin(a), -math.radians(25) * math.cos(a), a))
        bpy.context.active_object.data.materials.append(mat_vibrant_pink)
        
    bpy.ops.mesh.primitive_cylinder_add(radius=0.48, depth=0.85, location=(0, 0, 0.2))
    candle = bpy.context.active_object
    candle.data.materials.append(mat_vibrant_yellow)
    
    add_interior_candle((0, 0, 0.3), energy=24.0)
    add_top_hanger(0.68)
    add_standard_tassel(-0.42, mat_vibrant_pink, length=1.2)
    render_lantern(9, cam_z=-0.1, cam_dist=6.5)

# 10. Đèn búp sen hồng
def build_lantern_10():
    clean_mesh_objects()
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.92, location=(0, 0, 0.1))
    bud = bpy.context.active_object
    bud.scale = (0.85, 0.85, 1.48)
    bud.data.materials.append(mat_vibrant_pink)
    for p in bud.data.polygons: p.use_smooth = True
    
    for j in range(8):
        a = j * math.pi / 4
        c_data = bpy.data.curves.new(f"LotusRib_{j}", 'CURVE')
        c_data.dimensions = '3D'; c_data.bevel_depth = 0.015
        spline = c_data.splines.new('POLY')
        spline.points.add(10)
        for i in range(11):
            t = i / 10; z = (t - 0.5) * 2.6 + 0.1
            r = 0.93 * math.sin(t * math.pi) ** 0.85
            spline.points[i].co = (r * math.cos(a), r * math.sin(a), z, 1.0)
        robj = bpy.data.objects.new(f"LotusRib_{j}", c_data)
        bpy.context.collection.objects.link(robj)
        robj.data.materials.append(mat_gold_foil)
        
    for i in range(5):
        a = i * 2 * math.pi / 5
        x = 0.68 * math.cos(a); y = 0.68 * math.sin(a)
        bpy.ops.mesh.primitive_cone_add(radius1=0.38, radius2=0.05, depth=0.65, location=(x, y, -0.75), rotation=(math.radians(40)*math.sin(a), -math.radians(40)*math.cos(a), 0))
        bpy.context.active_object.data.materials.append(mat_vibrant_green)
        
    add_interior_candle((0, 0, 0.1), energy=22.0)
    add_top_hanger(1.42)
    add_standard_tassel(-1.12, mat_vibrant_pink, length=1.2)
    render_lantern(10, cam_z=-0.1, cam_dist=6.8)

# 11. Đèn chim thiên nga / phụng hoàng
def build_lantern_11():
    clean_mesh_objects()
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.82, location=(0.1, 0, -0.1))
    body = bpy.context.active_object
    body.scale = (1.2, 0.7, 0.8)
    body.data.materials.append(mat_vibrant_yellow)
    for p in body.data.polygons: p.use_smooth = True
    
    bpy.ops.mesh.primitive_cylinder_add(radius=0.13, depth=1.1, location=(-0.7, 0, 0.6), rotation=(0, math.radians(-35), 0))
    neck = bpy.context.active_object
    neck.data.materials.append(mat_vibrant_yellow)
    
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.23, location=(-0.95, 0, 1.1))
    head = bpy.context.active_object
    head.data.materials.append(mat_vibrant_yellow)
    
    bpy.ops.mesh.primitive_cone_add(radius1=0.1, radius2=0.02, depth=0.3, location=(-1.2, 0, 1.05), rotation=(0, -math.pi/2, 0))
    bpy.context.active_object.data.materials.append(mat_vibrant_red)
    
    for side in [-1, 1]:
        bpy.ops.mesh.primitive_cylinder_add(radius=0.68, depth=0.05, location=(0.1, side * 0.45, 0.2), rotation=(side * math.radians(25), 0, math.radians(15)))
        w = bpy.context.active_object
        w.scale = (1.2, 0.5, 1.0)
        w.data.materials.append(mat_vibrant_red)
        
    add_interior_candle((0, 0, 0), energy=20.0)
    add_top_hanger(1.1)
    add_standard_tassel(-0.85, mat_gold_foil, length=1.2)
    render_lantern(11, cam_z=-0.1, cam_dist=6.8)

# 12. Đèn xếp Hội An cam rực rỡ
def build_lantern_12():
    clean_mesh_objects()
    bpy.ops.mesh.primitive_uv_sphere_add(radius=1.18, location=(0, 0, 0))
    pump = bpy.context.active_object
    pump.scale = (1.2, 1.2, 0.72)
    pump.data.materials.append(mat_vibrant_orange)
    for p in pump.data.polygons: p.use_smooth = True
    
    for z in [-0.45, -0.2, 0.0, 0.2, 0.45]:
        r = 1.36 * math.cos(z / 0.8)
        bpy.ops.mesh.primitive_torus_add(major_radius=r, minor_radius=0.026, location=(0, 0, z), rotation=(0, 0, 0))
        bpy.context.active_object.data.materials.append(mat_gold_foil)
        
    add_interior_candle((0, 0, 0), energy=22.0)
    add_top_hanger(0.82)
    add_standard_tassel(-0.82, mat_vibrant_yellow, length=1.2)
    render_lantern(12, cam_z=-0.1, cam_dist=6.8)

# 13. Đèn kéo quân tứ giác
def build_lantern_13():
    clean_mesh_objects()
    bpy.ops.mesh.primitive_cube_add(size=1.2, location=(0, 0, 0))
    cube = bpy.context.active_object
    cube.scale = (0.9, 0.9, 1.25)
    cube.data.materials.append(mat_vibrant_yellow)
    
    bpy.ops.mesh.primitive_cone_add(vertices=4, radius1=1.45, radius2=0.2, depth=0.58, location=(0, 0, 1.08), rotation=(0, 0, math.pi/4))
    bpy.context.active_object.data.materials.append(mat_vibrant_red)
    
    bpy.ops.mesh.primitive_cube_add(size=1.35, location=(0, 0, -0.85))
    base = bpy.context.active_object
    base.scale = (1.0, 1.0, 0.15)
    base.data.materials.append(mat_lacquer_wood)
    
    for sx in [-0.55, 0.55]:
        for sy in [-0.55, 0.55]:
            bpy.ops.mesh.primitive_cylinder_add(radius=0.045, depth=1.5, location=(sx, sy, 0))
            bpy.context.active_object.data.materials.append(mat_gold_foil)
            
    add_interior_candle((0, 0, 0), energy=24.0)
    add_top_hanger(1.35)
    add_standard_tassel(-0.95, mat_vibrant_red, length=1.2)
    render_lantern(13, cam_z=-0.1, cam_dist=6.8)

# 14. Đèn rồng lửa ngũ sắc dân gian
def build_lantern_14():
    clean_mesh_objects()
    segs = [
        (-0.75, 0, 0.25, 0.65, mat_vibrant_red),
        (-0.20, 0, 0.12, 0.60, mat_vibrant_orange),
        (0.32, 0, -0.10, 0.55, mat_vibrant_yellow),
        (0.80, 0, -0.32, 0.48, mat_vibrant_green)
    ]
    for sx, sy, sz, sr, sm in segs:
        bpy.ops.mesh.primitive_uv_sphere_add(radius=sr, location=(sx, sy, sz))
        s_obj = bpy.context.active_object
        s_obj.data.materials.append(sm)
        for p in s_obj.data.polygons: p.use_smooth = True
        bpy.ops.mesh.primitive_torus_add(major_radius=sr * 0.98, minor_radius=0.02, location=(sx, sy, sz), rotation=(0, math.pi/2, 0))
        bpy.context.active_object.data.materials.append(mat_gold_foil)
        
    for side in [-1, 1]:
        bpy.ops.mesh.primitive_cone_add(radius1=0.1, radius2=0.02, depth=0.45, location=(-0.75, side * 0.2, 0.95), rotation=(0, 0, side * math.radians(20)))
        bpy.context.active_object.data.materials.append(mat_gold_foil)
        
    add_interior_candle((0, 0, 0), energy=20.0)
    add_top_hanger(0.72)
    add_standard_tassel(-0.68, mat_vibrant_red, length=1.2)
    render_lantern(14, cam_z=-0.1, cam_dist=6.8)

# 15. Đèn gà trống ngũ sắc dân gian Đông Hồ
def build_lantern_15():
    clean_mesh_objects()
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.78, location=(0, 0, 0))
    body = bpy.context.active_object
    body.scale = (1.1, 0.75, 1.0)
    body.data.materials.append(mat_vibrant_yellow)
    for p in body.data.polygons: p.use_smooth = True
    
    # Red comb
    bpy.ops.mesh.primitive_cylinder_add(radius=0.38, depth=0.08, location=(-0.4, 0, 1.05), rotation=(math.pi/2, 0, 0))
    comb = bpy.context.active_object
    comb.scale = (0.5, 1.0, 1.25)
    comb.data.materials.append(mat_vibrant_red)
    
    bpy.ops.mesh.primitive_cone_add(radius1=0.12, radius2=0.02, depth=0.32, location=(-1.02, 0, 0.55), rotation=(0, -math.pi/2, 0))
    bpy.context.active_object.data.materials.append(mat_gold_foil)
    
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.15, location=(-0.75, 0, 0.35))
    bpy.context.active_object.data.materials.append(mat_vibrant_red)
    
    for side in [-1, 1]:
        bpy.ops.mesh.primitive_cylinder_add(radius=0.45, depth=0.05, location=(0, side * 0.42, 0), rotation=(side * math.radians(20), 0, 0))
        w = bpy.context.active_object
        w.data.materials.append(mat_vibrant_green)
        
    bpy.ops.mesh.primitive_cone_add(radius1=0.55, radius2=0.05, depth=1.15, location=(0.88, 0, 0.52), rotation=(0, math.radians(45), 0))
    tail = bpy.context.active_object
    tail.scale = (1.2, 0.3, 1.0)
    tail.data.materials.append(mat_vibrant_cyan)
    
    add_interior_candle((0, 0, 0.1), energy=20.0)
    add_top_hanger(0.98)
    add_standard_tassel(-0.75, mat_vibrant_red, length=1.2)
    render_lantern(15, cam_z=-0.1, cam_dist=6.8)

# 16. Đèn hồ lô song hỷ
def build_lantern_16():
    clean_mesh_objects()
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.62, location=(0, 0, 0.58))
    top_b = bpy.context.active_object
    top_b.data.materials.append(mat_vibrant_yellow)
    for p in top_b.data.polygons: p.use_smooth = True
    
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.92, location=(0, 0, -0.55))
    bot_b = bpy.context.active_object
    bot_b.data.materials.append(mat_vibrant_orange)
    for p in bot_b.data.polygons: p.use_smooth = True
    
    for j in range(6):
        a = j * math.pi / 3
        c_data = bpy.data.curves.new(f"GourdRib_{j}", 'CURVE')
        c_data.dimensions = '3D'; c_data.bevel_depth = 0.015
        spline = c_data.splines.new('POLY')
        spline.points.add(10)
        for i in range(11):
            t = i / 10; z = (t - 0.5) * 2.4
            r = 0.65 if z > 0 else 0.95
            r = r * math.cos(abs(z) * 0.7)
            spline.points[i].co = (r * math.cos(a), r * math.sin(a), z, 1.0)
        robj = bpy.data.objects.new(f"GourdRib_{j}", c_data)
        bpy.context.collection.objects.link(robj)
        robj.data.materials.append(mat_gold_foil)
        
    bpy.ops.mesh.primitive_torus_add(major_radius=0.52, minor_radius=0.065, location=(0, 0, 0.05), rotation=(0, 0, 0))
    bpy.context.active_object.data.materials.append(mat_vibrant_red)
    
    add_interior_candle((0, 0, -0.1), energy=22.0)
    add_top_hanger(1.18)
    add_standard_tassel(-1.48, mat_vibrant_green, length=1.3)
    render_lantern(16, cam_z=-0.2, cam_dist=7.0)

# Run all 16 generators
generators = [
    build_lantern_1, build_lantern_2, build_lantern_3, build_lantern_4,
    build_lantern_5, build_lantern_6, build_lantern_7, build_lantern_8,
    build_lantern_9, build_lantern_10, build_lantern_11, build_lantern_12,
    build_lantern_13, build_lantern_14, build_lantern_15, build_lantern_16
]

for idx, gen in enumerate(generators, 1):
    print(f"--- Re-rendering Lantern #{idx} with true vibrant folk glow ---")
    gen()

print("ALL 16 VIBRANT GLOWING FOLK LANTERNS RE-RENDERED SUCCESSFULLY!")
