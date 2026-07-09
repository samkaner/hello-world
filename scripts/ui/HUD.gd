extends CanvasLayer
## Heart-pip health display, driven by GameManager.health_changed.

const HEART_FULL := preload("res://assets/ui/heart_full.png")
const HEART_EMPTY := preload("res://assets/ui/heart_empty.png")

@onready var hearts_container: HBoxContainer = $Hearts

var _heart_rects: Array[TextureRect] = []


func _ready() -> void:
	GameManager.health_changed.connect(_on_health_changed)
	_rebuild_hearts(GameManager.max_health)
	_on_health_changed(GameManager.health, GameManager.max_health)


func _rebuild_hearts(max_health: int) -> void:
	for child in hearts_container.get_children():
		child.queue_free()
	_heart_rects.clear()
	for i in max_health:
		var rect := TextureRect.new()
		rect.texture = HEART_FULL
		rect.custom_minimum_size = Vector2(16, 16)
		hearts_container.add_child(rect)
		_heart_rects.append(rect)


func _on_health_changed(health: int, max_health: int) -> void:
	if _heart_rects.size() != max_health:
		_rebuild_hearts(max_health)
	for i in _heart_rects.size():
		_heart_rects[i].texture = HEART_FULL if i < health else HEART_EMPTY
