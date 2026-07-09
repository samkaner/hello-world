class_name BigYawn
extends BossBase
## Mini-boss: a sleepy stump. Phase 0 (above 55% health) = a ground slam
## that shocks the ground in front of it. Phase 1 (55% health or below) =
## a rolling charge across the room. Only two phases, per the "mini-boss
## capped at 2 phases" difficulty rule.

@export var slam_damage: int = 1
@export var roll_speed: float = 220.0
@export var roll_damage: int = 1
@export var roll_duration: float = 0.8

@onready var hazard_area: Area2D = $HazardArea

var _current_attack_damage: int = 1


func _ready() -> void:
	super._ready()
	max_health = 8
	health = max_health
	_phase_health_thresholds = [0.55]

	hazard_area.monitoring = false
	hazard_area.set_collision_layer_value(1, false)
	hazard_area.set_collision_mask_value(2, true)
	hazard_area.body_entered.connect(_on_hazard_body_entered)


func _perform_attack(stage: int) -> void:
	if stage == 0:
		await _slam_attack()
	else:
		await _roll_attack()


func _slam_attack() -> void:
	_current_attack_damage = slam_damage
	hazard_area.monitoring = true
	await get_tree().create_timer(0.35).timeout
	hazard_area.monitoring = false


func _roll_attack() -> void:
	_current_attack_damage = roll_damage
	var direction := -1 if sprite.flip_h else 1
	hazard_area.monitoring = true
	velocity.x = roll_speed * direction
	await get_tree().create_timer(roll_duration).timeout
	velocity.x = 0.0
	hazard_area.monitoring = false


func _on_hazard_body_entered(body: Node2D) -> void:
	if body.has_method("take_damage"):
		body.take_damage(_current_attack_damage)
