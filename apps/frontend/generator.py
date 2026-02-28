from string import Template

def create_landing_page(store_name, photo_url, address, output_filename):
    # 템플릿 로드
    with open('template.html', 'r', encoding='utf-8') as f:
        src = Template(f.read())
    
    # 데이터 치환
    result = src.substitute({
        'store_name': store_name,
        'photo_url': photo_url,
        'address': address
    })
    
    # 파일 저장
    with open(output_filename, 'w', encoding='utf-8') as f:
        f.write(result)
    print(f"'{output_filename}' 생성 완료!")

# 사용 예시
create_landing_page("우리 동네 맛집", "shop.jpg", "서울특별시 강남구 테헤란로 1", "index.html")