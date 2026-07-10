class_name Grumbleroot
extends BossBase
## Final boss: a grumpy stump wizard. Three attack phases keyed to health,
## capped at 3 per the difficulty rules:
##   Stage 0 (>66% health):   throws a seed-bolt projectile at the player
##   Stage 1 (33%-66% health): summons a Twiglet minion to help out
##   Stage 2 (<=33% health):   slams the ground for a wide shockwave

const TWIGLET_SCENE := preload("res://scenes/entities/enemies/Twiglet.tscn")
const PROJECTILE_TEXTURE := preload("res://assets/ui/zestberry.png")

@export var throw_damage: int = 1
@export var throw_speed: float = 170.0
@export var max_minions: int = 2
@export var shockwave_damage: int = 1

@onready var hazard_area: Area2D = $HazardArea


func _ready() -> void:
	super._ready()
	display_name = "Grumbleroot"
	max_health = 14
	health = max_health
	_phase_health_thresholds = [0.66, 0.33]

	hazard_area.monitoring = false
	hazard_area.set_collision_layer_value(1, false)
	hazard_area.set_collision_mask_value(2, true)
	hazard_area.body_entered.connect(_on_hazard_body_entered)


func _perform_attack(stage: int) -> void:
	match stage:
		0:
			await _throw_attack()
		1:
			await _summon_attack()
		_:
			await _shockwave_attack()


func _throw_attack() -> void:
	var target := get_tree().get_first_node_in_group("player")
	var direction := Vector2(-1.0 if sprite.flip_h else 1.0, 0.0)
	if target:
		direction = (target.global_position - global_position).normalized()
	_spawn_projectile(direction)
	await get_tree().create_timer(0.3).timeout


func _spawn_projectile(direction: Vector2) -> void:
	var proj := BossProjectile.new()
	proj.direction = direction
	proj.damage = throw_damage
	proj.speed = throw_speed
	proj.global_position = global_position

	var sprite_node := Sprite2D.new()
	sprite_node.texture = PROJECTILE_TEXTURE
	proj.add_child(sprite_node)

	var shape := CollisionShape2D.new()
	var circle := CircleShape2D.new()
	circle.radius = 8.0
	shape.shape = circle
	proj.add_child(shape)

	get_parent().add_child(proj)


func _summon_attack() -> void:
	if get_tree().get_nodes_in_group("grumbleroot_minion").size() < max_minions:
		var minion: Node2D = TWIGLET_SCENE.instantiate()
		minion.add_to_group("grumbleroot_minion")
		minion.global_position = global_position + Vector2(40.0, 0.0)
		get_parent().add_child(minion)
	await get_tree().create_timer(0.4).timeout


func _shockwave_attack() -> void:
	_shake_player_camera(4.0, 0.3)
	hazard_area.monitoring = true
	await get_tree().create_timer(0.4).timeout
	hazard_area.monitoring = false


func _on_hazard_body_entered(body: Node2D) -> void:
	if body.has_method("take_damage"):
		body.take_damage(shockwave_damage)
