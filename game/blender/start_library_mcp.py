import bpy
import os
import sys

BLEND_FILE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'generated', 'cosmo_library_atrium.blend'))

try:
    bpy.ops.preferences.addon_enable(module='blender_mcp')
except Exception as exc:
    print('MCP addon enable failed:', exc, flush=True)
    raise

if os.path.isfile(BLEND_FILE):
    bpy.ops.wm.open_mainfile(filepath=BLEND_FILE)

# Keep the bridge bound to loopback: its socket has no authentication.
scene = bpy.context.scene
scene.blendermcp_port = int(os.environ.get('BLENDER_PORT', '9876'))
scene.blendermcp_auto_start_server = False
if not hasattr(bpy.types, 'blendermcp_server') or not bpy.types.blendermcp_server:
    bpy.types.blendermcp_server = bpy.types.blendermcp_server if hasattr(bpy.types, 'blendermcp_server') else None
    from blender_mcp import BlenderMCPServer
    bpy.types.blendermcp_server = BlenderMCPServer(host='localhost', port=scene.blendermcp_port)
bpy.types.blendermcp_server.start()
scene.blendermcp_server_running = bpy.types.blendermcp_server.running
print('COSMO_BLENDER_MCP_READY', bpy.types.blendermcp_server.running, scene.blendermcp_port, BLEND_FILE, flush=True)
