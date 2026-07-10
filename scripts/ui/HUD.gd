extends CanvasLayer
## Heart-pip health display, driven by GameManager.health_changed, plus a
## boss health bar (built in code) that appears when a boss fight starts.

const HEART_FULL := preload("res://assets/ui/heart_full.png")
const HEART_EMPTY := preload("res://assets/ui/heart_empty.png")

@onready var hearts_container: HBoxContainer = $Hearts

var _heart_rects: Array[TextureRect] = []
var _boss_box: VBoxContainer
var _boss_name_label: Label
var _boss_bar: ProgressBar


func _ready() -> void:
	GameManager.health_changed.connect(_on_health_changed)
	GameManager.boss_battle_started.connect(_on_boss_battle_started)
	GameManager.boss_health_changed.connect(_on_boss_health_changed)
	_rebuild_hearts(GameManager.max_health)
	_on_health_changed(GameManager.health, GameManager.max_health)
	_build_boss_bar()


func _build_boss_bar() -> void:
	_boss_box = VBoxContainer.new()
	_boss_box.set_anchors_preset(Control.PRESET_CENTER_BOTTOM)
	_boss_box.offset_left = -110.0
	_boss_box.offset_right = 110.0
	_boss_box.offset_top = -34.0
	_boss_box.offset_bottom = -10.0
	_boss_box.visible = false
	add_child(_boss_box)

	_boss_name_label = Label.new()
	_boss_name_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_boss_name_label.add_theme_font_size_override("font_size", 10)
	_boss_box.add_child(_boss_name_label)

	_boss_bar = ProgressBar.new()
	_boss_bar.custom_minimum_size = Vector2(220, 8)
	_boss_bar.show_percentage = false
	_boss_box.add_child(_boss_bar)


func _on_boss_battle_started(boss_name: String, health: int, max_health: int) -> void:
	_boss_name_label.text = boss_name
	_boss_bar.max_value = max_health
	_boss_bar.value = health
	_boss_box.visible = true


func _on_boss_health_changed(health: int, _max_health: int) -> void:
	_boss_bar.value = health
	if health <= 0:
		_boss_box.visible = false


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
