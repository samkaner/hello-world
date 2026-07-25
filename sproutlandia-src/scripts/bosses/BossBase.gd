class_name BossBase
extends CharacterBody2D
## Shared boss state machine: IDLE (cooldown) -> TELEGRAPH -> ATTACK ->
## RECOVER, looping until health hits zero. Subclasses (BigYawn,
## Grumbleroot) override `_perform_attack(stage)` to implement their own
## attack patterns; `stage` increases as health crosses each threshold in
## `_phase_health_thresholds`, so later stages can mix in new attacks.
## Every attack is preceded by a telegraph so hits always feel fair.

signal defeated
signal health_changed(health: int, max_health: int)

enum Phase { IDLE, TELEGRAPH, ATTACK, RECOVER, DEFEATED }

@export var display_name: String = "Boss"
@export var max_health: int = 10
@export var gravity: float = 900.0
@export var contact_damage: int = 1
@export var telegraph_time: float = 0.7
@export var recover_time: float = 0.6
@export var attack_cooldown: float = 1.2

const FRAME_SIZE := 64
const FRAME_IDLE := 0
const FRAME_TELEGRAPH := 1
const FRAME_ATTACK := 2
const FRAME_HURT := 3

var health: int
var phase: Phase = Phase.IDLE
var _phase_health_thresholds: Array[float] = [0.5]
var _hurt_flash_timer: float = 0.0
var _battle_active: bool = false

@onready var sprite: Sprite2D = $Sprite
@onready var hurt_area: Area2D = $HurtArea


func _ready() -> void:
	health = max_health

	# See Player.gd for the full collision layer scheme: this body sits on
	# layer 4 (boss_body); HurtArea is layer 7 (boss_hurtbox, ladle target).
	collision_layer = 0
	collision_mask = 0
	set_collision_layer_value(4, true)
	set_collision_mask_value(1, true)

	hurt_area.collision_layer = 0
	hurt_area.collision_mask = 0
	hurt_area.set_collision_layer_value(7, true)


func start_battle() -> void:
	if _battle_active:
		return
	_battle_active = true
	Sfx.play("boss_roar")
	GameManager.boss_battle_started.emit(display_name, health, max_health)
	_run_battle_loop()


func _physics_process(delta: float) -> void:
	if phase != Phase.DEFEATED:
		velocity.y += gravity * delta
	if _hurt_flash_timer > 0.0:
		_hurt_flash_timer -= delta
	_update_animation()
	move_and_slide()


func get_contact_damage() -> int:
	return contact_damage


func take_damage(amount: int) -> void:
	if phase == Phase.DEFEATED:
		return
	health = max(health - amount, 0)
	_hurt_flash_timer = 0.15
	Sfx.play("boss_hit")
	health_changed.emit(health, max_health)
	GameManager.boss_health_changed.emit(health, max_health)
	if health <= 0:
		_defeat()


func _defeat() -> void:
	phase = Phase.DEFEATED
	_battle_active = false
	defeated.emit()
	var tween := create_tween()
	tween.tween_property(sprite, "modulate:a", 0.0, 0.6)
	await tween.finished
	queue_free()


func _run_battle_loop() -> void:
	while _battle_active and phase != Phase.DEFEATED:
		phase = Phase.IDLE
		await get_tree().create_timer(attack_cooldown).timeout
		if not _battle_active:
			return

		_face_player()
		phase = Phase.TELEGRAPH
		var pulse := create_tween()
		pulse.tween_property(sprite, "scale", Vector2(1.15, 1.15), 0.15)
		pulse.tween_property(sprite, "scale", Vector2(1.0, 1.0), 0.15)
		await get_tree().create_timer(telegraph_time).timeout
		if not _battle_active:
			return

		phase = Phase.ATTACK
		await _perform_attack(_current_stage())
		if not _battle_active:
			return

		phase = Phase.RECOVER
		await get_tree().create_timer(recover_time).timeout


func _face_player() -> void:
	var player := get_tree().get_first_node_in_group("player")
	if player:
		sprite.flip_h = player.global_position.x < global_position.x


func _shake_player_camera(strength: float, duration: float) -> void:
	var player := get_tree().get_first_node_in_group("player")
	if player and player.has_method("shake_camera"):
		player.shake_camera(strength, duration)


func _current_stage() -> int:
	var health_pct := float(health) / float(max_health)
	var stage := 0
	for threshold in _phase_health_thresholds:
		if health_pct <= threshold:
			stage += 1
	return stage


func _perform_attack(_stage: int) -> void:
	# Override in subclasses.
	await get_tree().create_timer(0.4).timeout


func _update_animation() -> void:
	var frame := FRAME_IDLE
	match phase:
		Phase.TELEGRAPH:
			frame = FRAME_TELEGRAPH
		Phase.ATTACK:
			frame = FRAME_ATTACK
		_:
			frame = FRAME_IDLE
	if _hurt_flash_timer > 0.0:
		frame = FRAME_HURT

	var region := sprite.region_rect
	region.position.x = frame * FRAME_SIZE
	sprite.region_rect = region
