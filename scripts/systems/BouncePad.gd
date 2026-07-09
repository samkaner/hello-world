extends Area2D
## Fizzy Falls' bouncy water: launches the player upward on contact. Built
## by LevelBase.spawn_bounce_pad.

@export var bounce_velocity: float = -420.0


func _ready() -> void:
	set_collision_layer_value(1, false)
	set_collision_mask_value(2, true)
	body_entered.connect(_on_body_entered)


func _on_body_entered(body: Node2D) -> void:
	if body.is_in_group("player"):
		body.velocity.y = bounce_velocity
