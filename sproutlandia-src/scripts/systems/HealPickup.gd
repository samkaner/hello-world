extends Area2D
## A small bonus heal, e.g. tucked in Fizzy Falls' secret room. Built by
## LevelBase.spawn_heal_pickup.

@export var heal_amount: int = 1


func _ready() -> void:
	collision_layer = 0
	collision_mask = 0
	set_collision_mask_value(2, true)
	body_entered.connect(_on_body_entered)


func _on_body_entered(body: Node2D) -> void:
	if body.is_in_group("player"):
		GameManager.heal(heal_amount)
		Sfx.play("pickup")
		queue_free()
