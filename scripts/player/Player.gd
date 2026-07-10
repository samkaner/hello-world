class_name Player
extends CharacterBody2D
## Pip, the hero. Handles both platforming (Mario-flavored) and top-down
## (Zelda-flavored) movement depending on `top_down_mode`, driven entirely by
## GDScript so no hand-authored AnimationPlayer/SpriteFrames resources are
## needed -- frames are picked by moving a Sprite2D region_rect in code.

signal died

@export var speed: float = 140.0
@export var jump_velocity: float = -260.0
@export var gravity: float = 900.0
@export var max_fall_speed: float = 320.0
@export var hover_descent_speed: float = 35.0
@export var hover_max_time: float = 1.0
@export var ground_accel: float = 1600.0
@export var air_accel: float = 1100.0
@export var coyote_time: float = 0.12
@export var jump_buffer_time: float = 0.12
@export var top_down_mode: bool = false
@export var invincible_time: float = 1.0
@export var attack_damage: int = 1
@export var attack_offset_x: float = 16.0
@export var knockback_force: float = 180.0

enum State { IDLE, RUN, JUMP, HOVER, ATTACK, HURT }

const FRAME_SIZE := 32
const FRAME_IDLE := 0
const FRAME_WALK_1 := 1
const FRAME_WALK_2 := 2
const FRAME_JUMP := 3
const FRAME_ATTACK := 4
const FRAME_HURT := 5

var _state: State = State.IDLE
var _facing: int = 1
var _coyote_timer: float = 0.0
var _jump_buffer_timer: float = 0.0
var _hover_timer: float = 0.0
var _attack_timer: float = 0.0
var _hurt_timer: float = 0.0
var _invincible_timer: float = 0.0
var _walk_anim_timer: float = 0.0
var _walk_frame_toggle: bool = false
var _controls_locked: bool = false
var _hovering: bool = false
var _was_on_floor: bool = true
var _prev_fall_speed: float = 0.0
var _swipe: Polygon2D

@onready var sprite: Sprite2D = $Sprite
@onready var hitbox_area: Area2D = $HitboxArea
@onready var hurt_area: Area2D = $HurtArea
@onready var stomp_detector: Area2D = $StompDetector
@onready var camera: Camera2D = $Camera2D

var _shake_timer: float = 0.0
var _shake_strength: float = 0.0


func _ready() -> void:
	add_to_group("player")

	# Collision layers (set entirely in code so the scheme lives in one
	# place, not split across hand-typed .tscn bitmasks):
	#   1=world  2=player_body  3=enemy_body  4=boss_body  5=hazard
	#   6=enemy_hurtbox (ladle target)  7=boss_hurtbox (ladle target)
	#   8=stomp_zone (top-of-enemy stomp target)
	# Each interaction type uses exactly one detection direction so damage
	# can never double-fire from both sides of an overlap.
	# Always clear the default bit-1 layer/mask before setting bits: a
	# leaked default meant the attack hitbox could detect the player's own
	# hurtbox (both defaulted to bit 1) -- i.e. swinging the ladle hurt Pip.
	collision_layer = 0
	collision_mask = 0
	set_collision_layer_value(2, true)
	set_collision_mask_value(1, true)

	hitbox_area.monitoring = false
	hitbox_area.collision_layer = 0
	hitbox_area.collision_mask = 0
	hitbox_area.set_collision_mask_value(6, true)
	hitbox_area.set_collision_mask_value(7, true)
	hitbox_area.area_entered.connect(_on_hitbox_area_entered)

	# Dedicated hazard attacks (boss slams/projectiles) detect the player
	# directly and call take_damage() themselves, so they don't route
	# through this area.
	hurt_area.collision_layer = 0
	hurt_area.collision_mask = 0
	hurt_area.set_collision_mask_value(3, true)
	hurt_area.set_collision_mask_value(4, true)
	hurt_area.body_entered.connect(_on_hurt_area_body_entered)

	stomp_detector.collision_layer = 0
	stomp_detector.collision_mask = 0
	stomp_detector.set_collision_mask_value(8, true)
	stomp_detector.area_entered.connect(_on_stomp_area_entered)

	_build_swipe_visual()


func _build_swipe_visual() -> void:
	# A crescent arc that sweeps during the ladle swing, so the attack is
	# actually visible instead of just a sprite frame change.
	var points: PackedVector2Array = []
	var steps := 8
	for i in steps + 1:
		var a := lerpf(-1.1, 1.1, float(i) / steps)
		points.append(Vector2(cos(a), sin(a)) * 15.0)
	for i in steps + 1:
		var a := lerpf(1.1, -1.1, float(i) / steps)
		points.append(Vector2(cos(a), sin(a)) * 9.0)
	_swipe = Polygon2D.new()
	_swipe.polygon = points
	_swipe.color = Color(1.0, 0.95, 0.75, 0.85)
	_swipe.visible = false
	hitbox_area.add_child(_swipe)


func _physics_process(delta: float) -> void:
	if _hurt_timer > 0.0:
		_hurt_timer = max(_hurt_timer - delta, 0.0)
		_controls_locked = _hurt_timer > 0.15
	else:
		_controls_locked = false

	if _invincible_timer > 0.0:
		_invincible_timer -= delta
		sprite.visible = int(_invincible_timer * 20.0) % 2 == 0
	elif not sprite.visible:
		sprite.visible = true

	if top_down_mode:
		_physics_process_top_down(delta)
	else:
		_physics_process_platformer(delta)

	if _attack_timer > 0.0:
		_attack_timer = max(_attack_timer - delta, 0.0)
		if _attack_timer <= 0.0:
			hitbox_area.monitoring = false

	if _shake_timer > 0.0:
		_shake_timer = max(_shake_timer - delta, 0.0)
		if _shake_timer > 0.0:
			camera.offset = Vector2(
				randf_range(-_shake_strength, _shake_strength),
				randf_range(-_shake_strength, _shake_strength)
			)
		else:
			camera.offset = Vector2.ZERO

	_update_animation(delta)
	move_and_slide()


func shake_camera(strength: float = 3.0, duration: float = 0.2) -> void:
	_shake_strength = strength
	_shake_timer = duration


func _physics_process_platformer(delta: float) -> void:
	var on_floor := is_on_floor()

	# Kirby-style hover: while falling with jump held, settle quickly into
	# a gentle constant descent instead of just weakening gravity -- much
	# smoother and easier to steer.
	_hovering = not on_floor and not _controls_locked \
		and Input.is_action_pressed("jump") and velocity.y > 0.0 and _hover_timer > 0.0
	if _hovering:
		_hover_timer -= delta
		velocity.y = move_toward(velocity.y, hover_descent_speed, 1400.0 * delta)
	else:
		velocity.y = min(velocity.y + gravity * delta, max_fall_speed)

	# Variable jump height: releasing jump early cuts the rise short.
	if Input.is_action_just_released("jump") and velocity.y < 0.0:
		velocity.y *= 0.45

	var input_dir := 0.0
	if not _controls_locked:
		input_dir = Input.get_axis("move_left", "move_right")

	if input_dir != 0.0:
		_facing = int(sign(input_dir))
		sprite.flip_h = _facing < 0

	# Accelerate toward the target speed instead of snapping -- keeps runs
	# responsive but takes the "on ice-skates made of glue" edge off.
	if _controls_locked:
		velocity.x = move_toward(velocity.x, 0.0, ground_accel * 0.5 * delta)
	else:
		var accel := ground_accel if on_floor else air_accel
		velocity.x = move_toward(velocity.x, input_dir * speed, accel * delta)

	if on_floor:
		if not _was_on_floor and _prev_fall_speed > 140.0:
			_apply_squash(Vector2(1.25, 0.75))
		_coyote_timer = coyote_time
		_hover_timer = hover_max_time
	else:
		_coyote_timer = max(_coyote_timer - delta, 0.0)

	if Input.is_action_just_pressed("jump"):
		_jump_buffer_timer = jump_buffer_time
	else:
		_jump_buffer_timer = max(_jump_buffer_timer - delta, 0.0)

	if not _controls_locked and _jump_buffer_timer > 0.0 and _coyote_timer > 0.0:
		velocity.y = jump_velocity
		_jump_buffer_timer = 0.0
		_coyote_timer = 0.0
		Sfx.play("jump")
		_apply_squash(Vector2(0.8, 1.2))

	if not _controls_locked and Input.is_action_just_pressed("attack"):
		_start_attack()

	_was_on_floor = on_floor
	_prev_fall_speed = velocity.y

	var new_state := _pick_platformer_state(on_floor)
	if new_state == State.HOVER and _state != State.HOVER:
		Sfx.play("hover")
	_state = new_state


func _apply_squash(squash: Vector2) -> void:
	sprite.scale = squash
	var tween := create_tween()
	tween.tween_property(sprite, "scale", Vector2.ONE, 0.18)\
		.set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)


func _physics_process_top_down(delta: float) -> void:
	var input_vec := Vector2(
		Input.get_axis("move_left", "move_right"),
		Input.get_axis("move_up", "move_down")
	)
	if _controls_locked:
		# Let knockback play out instead of zeroing it instantly.
		velocity = velocity.move_toward(Vector2.ZERO, speed * 4.0 * delta)
	elif input_vec.length() > 0.0:
		input_vec = input_vec.normalized()
		if input_vec.x != 0.0:
			_facing = int(sign(input_vec.x))
			sprite.flip_h = _facing < 0
		velocity = input_vec * speed
	else:
		velocity = Vector2.ZERO

	if not _controls_locked and Input.is_action_just_pressed("attack"):
		_start_attack()

	if _hurt_timer > 0.0:
		_state = State.HURT
	elif _attack_timer <= 0.0:
		_state = State.RUN if velocity.length() > 1.0 else State.IDLE


func _pick_platformer_state(on_floor: bool) -> State:
	if _hurt_timer > 0.0:
		return State.HURT
	if _attack_timer > 0.0:
		return State.ATTACK
	if not on_floor:
		return State.HOVER if _hovering else State.JUMP
	if abs(velocity.x) > 1.0:
		return State.RUN
	return State.IDLE


func _start_attack() -> void:
	_attack_timer = 0.25
	_state = State.ATTACK
	Sfx.play("attack")
	var pos := hitbox_area.position
	pos.x = attack_offset_x * _facing
	hitbox_area.position = pos
	hitbox_area.monitoring = true

	_swipe.visible = true
	_swipe.scale = Vector2(_facing, 1.0)
	_swipe.rotation = -1.2 * _facing
	_swipe.modulate.a = 1.0
	var tween := create_tween()
	tween.tween_property(_swipe, "rotation", 1.2 * _facing, 0.16)
	tween.parallel().tween_property(_swipe, "modulate:a", 0.0, 0.22)
	tween.tween_callback(func() -> void: _swipe.visible = false)


func take_damage(amount: int, knockback_dir: Vector2 = Vector2.ZERO) -> void:
	if _invincible_timer > 0.0:
		return
	_hurt_timer = 0.3
	_invincible_timer = invincible_time
	_state = State.HURT
	Sfx.play("hurt")
	shake_camera(3.0, 0.25)
	if knockback_dir != Vector2.ZERO:
		velocity = knockback_dir.normalized() * knockback_force
	GameManager.take_damage(amount)


func _on_hitbox_area_entered(area: Area2D) -> void:
	var target := area.get_parent()
	if target and target.has_method("take_damage"):
		target.take_damage(attack_damage)


func _on_hurt_area_body_entered(body: Node2D) -> void:
	if not body.has_method("get_contact_damage"):
		return
	# Falling onto an enemy from above is a stomp, not a hit -- the
	# StompDetector overlap fires off the same contact, so let it win.
	if not top_down_mode and velocity.y > 0.0 and global_position.y < body.global_position.y and body.has_method("stomp_kill"):
		return
	var dir: Vector2 = global_position - body.global_position
	take_damage(body.get_contact_damage(), dir)


func _on_stomp_area_entered(area: Area2D) -> void:
	var target := area.get_parent()
	if target and target.has_method("stomp_kill"):
		target.stomp_kill()
		velocity.y = jump_velocity * 0.6
		Sfx.play("stomp")
		shake_camera(1.5, 0.1)


func _update_animation(delta: float) -> void:
	var frame := FRAME_IDLE
	match _state:
		State.IDLE:
			frame = FRAME_IDLE
		State.RUN:
			_walk_anim_timer += delta
			if _walk_anim_timer > 0.12:
				_walk_anim_timer = 0.0
				_walk_frame_toggle = not _walk_frame_toggle
			frame = FRAME_WALK_1 if _walk_frame_toggle else FRAME_WALK_2
		State.JUMP, State.HOVER:
			frame = FRAME_JUMP
		State.ATTACK:
			frame = FRAME_ATTACK
		State.HURT:
			frame = FRAME_HURT

	var region := sprite.region_rect
	region.position.x = frame * FRAME_SIZE
	sprite.region_rect = region
