extends Area2D
## A "fell into a pit" zone (built procedurally by LevelBase.spawn_kill_zone).
## Zeroes the player's health, which routes through the normal defeat flow:
## respawn at checkpoint in a regular level, Game Over during a boss fight.


func _ready() -> void:
	body_entered.connect(_on_body_entered)
	collision_layer = 0
	collision_mask = 0
	set_collision_mask_value(2, true)


func _on_body_entered(body: Node2D) -> void:
	if body.is_in_group("player"):
		# Go through GameManager directly: a pit must kill even while the
		# player has post-hit invincibility frames, or they fall forever.
		GameManager.take_damage(GameManager.health)
