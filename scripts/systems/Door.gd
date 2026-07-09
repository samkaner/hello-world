extends StaticBody2D
## A blocking wall segment that disappears when opened (connect a
## PressurePlate's `activated` signal to `open`). Built by
## LevelBase.spawn_door.


func open() -> void:
	queue_free()
