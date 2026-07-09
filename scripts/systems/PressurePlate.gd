extends Area2D
## Fires once when a pushable block (or anything else on the
## pushable_block layer) slides over it. Built by LevelBase.spawn_pressure_plate.

signal activated

var _active: bool = false


func _ready() -> void:
	set_collision_layer_value(1, false)
	set_collision_mask_value(9, true)  # pushable_block
	body_entered.connect(_on_body_entered)


func _on_body_entered(_body: Node2D) -> void:
	if not _active:
		_active = true
		activated.emit()
