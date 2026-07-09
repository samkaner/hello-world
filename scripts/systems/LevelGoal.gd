extends Area2D
## Placed at the end of a level (built procedurally by LevelBase.spawn_goal);
## completes the level when the player reaches it.


func _ready() -> void:
	body_entered.connect(_on_body_entered)
	set_collision_layer_value(1, false)
	set_collision_mask_value(2, true)


func _on_body_entered(body: Node2D) -> void:
	if body.is_in_group("player"):
		GameManager.complete_level()
