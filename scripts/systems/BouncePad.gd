extends Area2D
## Fizzy Falls' bouncy water: launches the player upward on contact. Built
## by LevelBase.spawn_bounce_pad.

@export var bounce_velocity: float = -420.0


func _ready() -> void:
	collision_layer = 0
	collision_mask = 0
	set_collision_mask_value(2, true)
	body_entered.connect(_on_body_entered)


func _on_body_entered(body: Node2D) -> void:
	if body.is_in_group("player"):
		body.velocity.y = bounce_velocity
