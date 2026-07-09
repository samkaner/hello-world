class_name LevelBase
extends Node2D
## Common setup for every level scene: registers with GameManager, restores
## the player to the last checkpoint (or the level's authored start
## position), and provides helpers for building static geometry and trigger
## zones from code -- so levels don't need hand-authored TileMap resources
## or dozens of one-off Area2D/CollisionShape2D nodes.

const CHECKPOINT_SCRIPT := preload("res://scripts/systems/CheckpointTrigger.gd")
const GOAL_SCRIPT := preload("res://scripts/systems/LevelGoal.gd")
const KILL_ZONE_SCRIPT := preload("res://scripts/systems/KillZone.gd")
const BOSS_ARENA_SCRIPT := preload("res://scripts/systems/BossArena.gd")
const PRESSURE_PLATE_SCRIPT := preload("res://scripts/systems/PressurePlate.gd")
const DOOR_SCRIPT := preload("res://scripts/systems/Door.gd")
const PUSHABLE_BLOCK_SCRIPT := preload("res://scripts/systems/PushableBlock.gd")
const BOUNCE_PAD_SCRIPT := preload("res://scripts/systems/BouncePad.gd")
const TOP_DOWN_ZONE_SCRIPT := preload("res://scripts/systems/TopDownZone.gd")
const PLATFORM_MODE_ZONE_SCRIPT := preload("res://scripts/systems/PlatformModeZone.gd")
const HEAL_PICKUP_SCRIPT := preload("res://scripts/systems/HealPickup.gd")

@export var is_boss_level: bool = false
@export var ground_texture: Texture2D
@export var wall_texture: Texture2D

@onready var player: Player = $Player


func _ready() -> void:
	GameManager.register_level(scene_file_path, is_boss_level)
	player.global_position = GameManager.get_respawn_position(player.global_position)
	_build_level()


func _build_level() -> void:
	pass  # overridden by each level script


func set_camera_bounds(rect: Rect2) -> void:
	var camera: Camera2D = player.get_node("Camera2D")
	camera.limit_left = int(rect.position.x)
	camera.limit_top = int(rect.position.y)
	camera.limit_right = int(rect.position.x + rect.size.x)
	camera.limit_bottom = int(rect.position.y + rect.size.y)


func setup_parallax_background(folder: String) -> void:
	var bg := ParallaxBackground.new()
	add_child(bg)
	move_child(bg, 0)
	_add_parallax_layer(bg, folder, "far", 0.2)
	_add_parallax_layer(bg, folder, "mid", 0.5)
	_add_parallax_layer(bg, folder, "near", 0.8)


func _add_parallax_layer(bg: ParallaxBackground, folder: String, layer_name: String, scale_factor: float) -> void:
	var layer := ParallaxLayer.new()
	layer.motion_scale = Vector2(scale_factor, scale_factor)
	layer.motion_mirroring = Vector2(480, 0)
	var sprite := Sprite2D.new()
	sprite.texture = load("res://assets/backgrounds/%s/%s.png" % [folder, layer_name])
	sprite.centered = false
	layer.add_child(sprite)
	bg.add_child(layer)


func build_floor(rects: Array) -> void:
	PlatformBuilder.build_platforms(self, rects, ground_texture)


func build_walls(rects: Array) -> void:
	PlatformBuilder.build_platforms(self, rects, wall_texture)


func spawn_checkpoint(rect: Rect2) -> void:
	_spawn_trigger(CHECKPOINT_SCRIPT, rect)


func spawn_goal(rect: Rect2) -> void:
	_spawn_trigger(GOAL_SCRIPT, rect)


func spawn_kill_zone(rect: Rect2) -> void:
	_spawn_trigger(KILL_ZONE_SCRIPT, rect)


func spawn_boss_arena(rect: Rect2, boss: Node) -> void:
	var area := _spawn_trigger(BOSS_ARENA_SCRIPT, rect)
	area.boss_path = area.get_path_to(boss)


func spawn_pressure_plate(rect: Rect2) -> Area2D:
	return _spawn_trigger(PRESSURE_PLATE_SCRIPT, rect)


func spawn_bounce_pad(rect: Rect2) -> void:
	_spawn_trigger(BOUNCE_PAD_SCRIPT, rect)


func spawn_top_down_zone(rect: Rect2) -> void:
	_spawn_trigger(TOP_DOWN_ZONE_SCRIPT, rect)


func spawn_platform_mode_zone(rect: Rect2) -> void:
	_spawn_trigger(PLATFORM_MODE_ZONE_SCRIPT, rect)


func spawn_heal_pickup(rect: Rect2) -> void:
	_spawn_trigger(HEAL_PICKUP_SCRIPT, rect)


func spawn_door(rect: Rect2) -> StaticBody2D:
	var door := PlatformBuilder.build_platform(self, rect, wall_texture)
	door.set_script(DOOR_SCRIPT)
	return door


func spawn_pushable_block(rect: Rect2) -> CharacterBody2D:
	var block := CharacterBody2D.new()
	block.position = rect.position + rect.size / 2.0

	var shape := CollisionShape2D.new()
	var rect_shape := RectangleShape2D.new()
	rect_shape.size = rect.size
	shape.shape = rect_shape
	block.add_child(shape)

	var sprite := Sprite2D.new()
	sprite.texture = wall_texture
	sprite.region_enabled = true
	sprite.region_rect = Rect2(Vector2.ZERO, rect.size)
	sprite.texture_repeat = CanvasItem.TEXTURE_REPEAT_ENABLED
	block.add_child(sprite)

	var push_zone := Area2D.new()
	push_zone.name = "PushZone"
	var push_shape := CollisionShape2D.new()
	var push_rect_shape := RectangleShape2D.new()
	push_rect_shape.size = rect.size + Vector2(10, 10)
	push_shape.shape = push_rect_shape
	push_zone.add_child(push_shape)
	block.add_child(push_zone)

	block.set_script(PUSHABLE_BLOCK_SCRIPT)
	add_child(block)
	return block


func _spawn_trigger(script: Script, rect: Rect2) -> Area2D:
	var area := Area2D.new()
	area.position = rect.position + rect.size / 2.0
	var shape := CollisionShape2D.new()
	var rect_shape := RectangleShape2D.new()
	rect_shape.size = rect.size
	shape.shape = rect_shape
	area.add_child(shape)
	area.set_script(script)
	add_child(area)
	return area
