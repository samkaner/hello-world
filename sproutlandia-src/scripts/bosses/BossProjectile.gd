class_name BossProjectile
extends Area2D
## A simple self-propelled hazard used by ranged boss attacks (e.g.
## Grumbleroot's thrown seed-bolt). The firing boss builds and configures
## one of these entirely from code, since a one-shot projectile doesn't
## need its own hand-authored scene.

@export var speed: float = 160.0
@export var damage: int = 1
@export var lifetime: float = 3.0

var direction: Vector2 = Vector2.RIGHT
var _age: float = 0.0


func _ready() -> void:
	collision_layer = 0
	collision_mask = 0
	set_collision_mask_value(1, true)  # despawn against world geometry
	set_collision_mask_value(2, true)  # hit the player
	body_entered.connect(_on_body_entered)


func _physics_process(delta: float) -> void:
	position += direction * speed * delta
	_age += delta
	if _age >= lifetime:
		queue_free()


func _on_body_entered(body: Node2D) -> void:
	if body.has_method("take_damage"):
		body.take_damage(damage)
	queue_free()
