extends Area2D
## Placed mid-level (built procedurally by LevelBase.spawn_checkpoint);
## saves the respawn position when the player passes through.


func _ready() -> void:
	body_entered.connect(_on_body_entered)
	set_collision_layer_value(1, false)
	set_collision_mask_value(2, true)


func _on_body_entered(body: Node2D) -> void:
	if body.is_in_group("player"):
		GameManager.set_checkpoint(global_position, GameManager.current_level_path)
