from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'output' / 'stock-design-options'
OUT.mkdir(parents=True, exist_ok=True)
S = 2
INK, MUTED, LINE, BLUE = '#183453', '#8391a3', '#e7edf3', '#123e77'
FONT = Path('C:/Windows/Fonts')
car = Image.open(ROOT / 'public/pictures/vf3-ce1v.webp').convert('RGBA')
names = ['Cân đối hai cột', 'Thông tin liền mạch', 'VIN dẫn hướng', 'Ảnh nhỏ · dữ liệu rõ', 'Tối giản đường kẻ', 'Thông số theo hàng', 'Chân thẻ gọn', 'Ảnh và thông tin song song', 'Phân nhóm nhẹ', 'Danh sách cô đọng']
notes = ['Giữ bố cục quen thuộc, giảm khoảng trống', 'Màu, kho, DMS và số máy xếp cùng nhịp', 'VIN nổi bật, thông tin phụ xếp dưới', 'Ảnh vừa đủ nhận diện, ưu tiên nội dung', 'Ít đường chia, dùng khoảng cách để phân nhóm', 'Các nhãn và giá trị thẳng hàng dễ đối chiếu', 'Thông tin phía trên, tác vụ sát cạnh dưới', 'Hai vùng ảnh và dữ liệu được cân bằng', 'Nền phụ rất nhẹ cho thông số kỹ thuật', 'Chiều cao thấp, xem nhiều xe cùng lúc']

def font(size=13, bold=False):
    return ImageFont.truetype(str(FONT / ('segoeuib.ttf' if bold else 'segoeui.ttf')), round(size*S))

def make(n):
    im = Image.new('RGB', (600*S, 290*S), 'white')
    d = ImageDraw.Draw(im)
    def box(x,y,w,h,fill='white',border=LINE,r=9):
        d.rounded_rectangle(tuple(round(v*S) for v in (x,y,x+w,y+h)), radius=r*S, fill=fill, outline=border, width=S)
    def t(x,y,text,size=13,bold=False,color=INK):
        d.text((x*S,y*S), text, font=font(size,bold), fill=color)
    def line(x,y,x2,y2): d.line((x*S,y*S,x2*S,y2*S), fill=LINE, width=S)
    def photo(x,y,w=110,h=80):
        img=car.copy(); img.thumbnail((w*S,h*S),Image.Resampling.LANCZOS)
        im.paste(img,(round((x+w/2)*S-img.width/2),round((y+h/2)*S-img.height/2)),img)
    def status(x=482,y=21):
        d.ellipse((x*S,(y+6)*S,(x+6)*S,(y+12)*S),fill='#20a779')
        t(x+12,y,'Chưa ghép',11)
    def actions(y=237,full=False):
        if full:
            box(368,y,104,32); t(393,y+6,'Chi tiết',12)
            box(480,y,98,32,BLUE,BLUE,6);t(515,y+6,'Giữ',12,True,'white')
        else:
            box(440,y,78,30);t(458,y+5,'Chi tiết',12)
            box(526,y,52,30,BLUE,BLUE,6);t(542,y+5,'Giữ',12,True,'white')
    def vin(x,y,size=15,label=True):
        if label: t(x,y,'Số VIN',11,color=MUTED); y+=19
        t(x,y,'RLNVBL9K4TT754394',size,True,BLUE)
    def paint(x,y):
        d.ellipse((x*S,(y+5)*S,(x+10)*S,(y+15)*S),fill='#697787',outline='#546272')
        t(x+17,y,'Zenith Grey (CE1V) / Black',12)
    def spec(x,y,label,value):
        t(x,y,label,11,color=MUTED);t(x+57,y,value,12,color=INK)
    def base_header():
        t(22,18,'VF 3',20,True);t(77,25,'Plus',12,color=MUTED);status()
    box(1,1,598,288)
    if n==1:
        photo(20,30,130,92);t(171,22,'VF 3',20,True);t(171,52,'Plus',12,color=MUTED);status();vin(171,79)
        line(22,137,578,137);paint(22,153);t(39,184,'QL13 (HCM)',12)
        line(308,150,308,211);spec(325,153,'DMS','N31923');t(325,179,'Số máy',11,color=MUTED);t(325,198,'TZ160X3G26082800384',11)
        line(22,225,578,225);actions()
    elif n==2:
        base_header();photo(20,69,112,78);vin(151,71);paint(151,123);t(151,150,'QL13 (HCM)',12)
        line(22,190,578,190);spec(22,204,'DMS','N31923');spec(235,204,'Số máy','TZ160X3G26082800384');actions()
    elif n==3:
        base_header();vin(22,65,19,False);line(22,107,578,107);photo(449,118,124,80)
        paint(22,122);t(39,152,'QL13 (HCM)',12);spec(22,182,'DMS','N31923');spec(22,205,'Số máy','TZ160X3G26082800384');actions()
    elif n==4:
        photo(20,20,87,65);t(122,20,'VF 3',20,True);t(122,49,'Plus',12,color=MUTED);status();vin(22,96,17)
        paint(22,153);t(340,153,'QL13 (HCM)',12);line(22,187,578,187)
        spec(22,203,'DMS','N31923');spec(220,203,'Số máy','TZ160X3G26082800384');actions()
    elif n==5:
        base_header();photo(22,79,126,87);vin(170,76);paint(170,129);t(187,157,'QL13 (HCM)',12)
        t(22,205,'DMS  N31923',11,color=MUTED);t(191,205,'Số máy  TZ160X3G26082800384',11,color=MUTED);actions()
    elif n==6:
        base_header();photo(442,61,135,88);vin(22,68)
        for y,label,value in [(133,'Màu','Zenith Grey (CE1V) / Black'),(159,'Kho','QL13 (HCM)'),(185,'DMS','N31923'),(211,'Số máy','TZ160X3G26082800384')]: spec(22,y,label,value)
        actions()
    elif n==7:
        base_header();photo(22,76,118,83);vin(161,71);paint(161,124);t(178,153,'QL13 (HCM)',12)
        box(2,204,596,83,'#f8fafc',None,8);spec(22,219,'DMS','N31923');t(22,245,'Số máy  TZ160X3G26082800384',11,color=MUTED);actions(234)
    elif n==8:
        photo(24,56,154,111);line(198,23,198,212);t(219,21,'VF 3',20,True);t(277,28,'Plus',12,color=MUTED);status();vin(219,71)
        paint(219,123);t(236,151,'QL13 (HCM)',12);spec(219,178,'DMS','N31923');spec(219,201,'Số máy','TZ160X3G26082800384');actions()
    elif n==9:
        base_header();photo(23,67,113,83);vin(157,68);paint(157,120);t(174,147,'QL13 (HCM)',12)
        box(22,184,556,39,'#f6f8fb',None,6);spec(34,195,'DMS','N31923');spec(224,195,'Số máy','TZ160X3G26082800384');actions()
    else:
        # A compact version of the same card, shown inside the same comparison canvas.
        d.rectangle((0,0,600*S,290*S),fill='#f3f6fa');box(1,36,598,215)
        photo(20,66,104,75);t(143,54,'VF 3',19,True);t(199,61,'Plus',12,color=MUTED);status(482,57);vin(143,91,14,False)
        paint(143,119);t(160,145,'QL13 (HCM)',12);line(22,176,578,176);spec(22,188,'DMS','N31923');spec(200,188,'Số máy','TZ160X3G26082800384');actions(214)
    im.save(OUT/f'mau-{n:02}.png')
    return im

cards=[make(i) for i in range(1,11)]
board=Image.new('RGB',(1260*S,1940*S),'#f3f6fa');d=ImageDraw.Draw(board)
d.text((28*S,22*S),'KHO XE / 10 PHƯƠNG ÁN TINH CHỈNH',font=font(26,True),fill=INK)
d.text((28*S,66*S),'Cùng dữ liệu · trạng thái không khung · VIN và số máy bấm để sao chép',font=font(14),fill=MUTED)
for i,card in enumerate(cards):
    x=24+(i%2)*620;y=116+(i//2)*362
    d.text((x*S,y*S),f'{i+1:02}  {names[i]}',font=font(17,True),fill=INK)
    d.text((x*S,(y+29)*S),notes[i],font=font(11),fill=MUTED)
    board.paste(card,(x*S,(y+56)*S))
board.save(OUT/'10-mau-kho-xe.png')
print(f'Created 10 individual designs and comparison board: {OUT}')
