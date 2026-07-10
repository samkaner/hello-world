class_name EnemyBase
extends CharacterBody2D
## Shared behavior for all regular (non-boss) enemies: back-and-forth patrol,
## contact damage, stomp-kill (platforming levels) or ladle-kill (both).
## Bonk-Bug and Twiglet reuse this script directly and are only
## differentiated via exported values + texture in their own scenes --
## their behavior doesn't diverge enough to need subclasses.

signal died

@export var speed: float = 40.0
@export var contact_damage: int = 1
@export var max_health: int = 2
@export var uses_gravity: bool = true
@export var patrol_distance: float = 64.0
@export var gravity: float = 900.0

const FRAME_SIZE := 32
const FRAME_MOVE_1 := 0
const FRAME_MOVE_2 := 1
const FRAME_HURT := 2

var health: int
var _direction: int = 1
var _spawn_x: float
var _walk_anim_timer: float = 0.0
var _walk_frame_toggle: bool = false
var _hurt_flash_timer: float = 0.0

@onready var sprite: Sprite2D = $Sprite
@onready var ledge_check: RayCast2D = $LedgeCheck
@onready var wall_check: RayCast2D = $WallCheck
@onready var hurt_area: Area2D = $HurtArea
@onready var stomp_zone: Area2D = $StompZone


func _ready() -> void:
	health = max_health
	_spawn_x = global_position.x

	# See Player.gd for the full collision layer scheme. This body sits on
	# layer 3 (enemy_body, for contact damage); HurtArea/StompZone are
	# separate layers (6/8) so a ladle swing and a stomp can never both
	# fire off the same overlap.
	set_collision_layer_value(1, false)
	set_collision_layer_value(3, true)
	set_collision_mask_value(1, true)

	hurt_area.set_collision_layer_value(1, false)
	hurt_area.set_collision_layer_value(6, true)

	stomp_zone.set_collision_layer_value(1, false)
	stomp_zone.set_collision_layer_value(8, true)


func _physics_process(delta: float) -> void:
	if uses_gravity:
		velocity.y += gravity * delta
	else:
		velocity.y = 0.0

	if _hurt_flash_timer > 0.0:
		_hurt_flash_timer -= delta

	if global_position.x - _spawn_x > patrol_distance:
		_direction = -1
	elif global_position.x - _spawn_x < -patrol_distance:
		_direction = 1

	if uses_gravity:
		var wall_target := wall_check.target_position
		wall_target.x = abs(wall_target.x) * _direction
		wall_check.target_position = wall_target
		wall_check.force_raycast_update()

		var ledge_pos := ledge_check.position
		ledge_pos.x = abs(ledge_pos.x) * _direction
		ledge_check.position = ledge_pos
		ledge_check.force_raycast_update()

		if wall_check.is_colliding() or not ledge_check.is_colliding():
			_direction *= -1
	elif is_on_wall():
		_direction *= -1

	velocity.x = speed * _direction
	sprite.flip_h = _direction < 0
	_update_animation(delta)
	move_and_slide()


func get_contact_damage() -> int:
	return contact_damage


func take_damage(amount: int) -> void:
	health -= amount
	_hurt_flash_timer = 0.2
	if health <= 0:
		die()


func stomp_kill() -> void:
	take_damage(health)


func die() -> void:
	died.emit()
	Sfx.play("enemy_die")
	queue_free()


func _update_animation(delta: float) -> void:
	var frame := FRAME_MOVE_1
	if _hurt_flash_timer > 0.0:
		frame = FRAME_HURT
	else:
		_walk_anim_timer += delta
		if _walk_anim_timer > 0.15:
			_walk_anim_timer = 0.0
			_walk_frame_toggle = not _walk_frame_toggle
		frame = FRAME_MOVE_1 if _walk_frame_toggle else FRAME_MOVE_2

	var region := sprite.region_rect
	region.position.x = frame * FRAME_SIZE
	sprite.region_rect = region
