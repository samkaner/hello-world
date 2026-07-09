class_name PlatformBuilder
extends RefCounted
## Spawns simple rectangular platform/wall geometry from a list of Rect2s at
## level _ready() time, instead of hand-authoring TileMap resources outside
## the Godot editor. Works for both platforming floors and top-down walls --
## a "platform" is just a static collider with a tiled texture.

static func build_platform(parent: Node2D, rect: Rect2, texture: Texture2D) -> StaticBody2D:
	var body := StaticBody2D.new()
	body.position = rect.position
	body.collision_layer = 1
	body.collision_mask = 0

	var shape := CollisionShape2D.new()
	var rect_shape := RectangleShape2D.new()
	rect_shape.size = rect.size
	shape.shape = rect_shape
	shape.position = rect.size / 2.0
	body.add_child(shape)

	var sprite := Sprite2D.new()
	sprite.texture = texture
	sprite.centered = false
	sprite.region_enabled = true
	sprite.region_rect = Rect2(Vector2.ZERO, rect.size)
	sprite.texture_repeat = CanvasItem.TEXTURE_REPEAT_ENABLED
	body.add_child(sprite)

	parent.add_child(body)
	return body


static func build_platforms(parent: Node2D, rects: Array, texture: Texture2D) -> void:
	for r: Rect2 in rects:
		build_platform(parent, r, texture)
