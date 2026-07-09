extends Area2D
## Switches the player into top-down movement while inside (used for Fizzy
## Falls' hidden calm-water room) and back to platforming on exit. Built by
## LevelBase.spawn_top_down_zone.


func _ready() -> void:
	set_collision_layer_value(1, false)
	set_collision_mask_value(2, true)
	body_entered.connect(_on_body_entered)
	body_exited.connect(_on_body_exited)


func _on_body_entered(body: Node2D) -> void:
	if body.is_in_group("player"):
		body.top_down_mode = true
		body.velocity = Vector2.ZERO


func _on_body_exited(body: Node2D) -> void:
	if body.is_in_group("player"):
		body.top_down_mode = false
