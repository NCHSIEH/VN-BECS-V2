# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: cdss-alert.spec.ts >> CDSS Dual Alert Block Simulation
- Location: cdss-alert.spec.ts:8:1

# Error details

```
TimeoutError: locator.waitFor: Timeout 5000ms exceeded.
Call log:
  - waiting for locator('text=Fatal Error') to be visible

```

```
Tearing down "context" exceeded the test timeout of 300000ms.
```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e6] [cursor=pointer]:
    - button "Open Next.js Dev Tools" [ref=e7]:
      - img [ref=e8]
    - generic [ref=e11]:
      - button "Open issues overlay" [ref=e12]:
        - generic [ref=e13]:
          - generic [ref=e14]: "0"
          - generic [ref=e15]: "1"
        - generic [ref=e16]: Issue
      - button "Collapse issues badge" [ref=e17]:
        - img [ref=e18]
  - alert [ref=e20]
  - generic [ref=e21]:
    - banner [ref=e22]:
      - generic [ref=e23]:
        - generic [ref=e24]:
          - generic [ref=e25]:
            - img [ref=e29]
            - generic [ref=e32]:
              - heading "VN-BECS V1.0 HOSPITAL COMMAND" [level=1] [ref=e33]
              - generic [ref=e34]:
                - img [ref=e35]
                - generic [ref=e38]: Cộng hòa Việt Nam
          - navigation [ref=e39]:
            - button "Tổng quan Trực tiếp" [ref=e40]: Tổng quan Trực tiếp
            - button "Hậu cần" [ref=e41]: Hậu cần
            - button "Phân tích" [ref=e42]: Phân tích
            - button "Dự đoán" [ref=e43]: Dự đoán
            - button "Báo cáo" [ref=e44]: Báo cáo
        - generic [ref=e45]:
          - generic [ref=e46]:
            - img [ref=e47]
            - textbox "Tìm kiếm Lệnh..." [ref=e50]
          - button "Trung tâm Hệ thống" [ref=e51]:
            - img [ref=e52]
            - generic [ref=e55]: Trung tâm Hệ thống
          - generic [ref=e56]:
            - button "切換系統視覺版型與色調" [ref=e57]:
              - img [ref=e58]
            - button "3" [ref=e64]:
              - img [ref=e65]
              - generic [ref=e68]: "3"
            - button [ref=e69]:
              - img [ref=e70]
          - generic [ref=e75] [cursor=pointer]:
            - generic [ref=e76]:
              - paragraph [ref=e77]: admin
              - paragraph [ref=e78]: Admin
            - img "Avatar" [ref=e81]
            - img [ref=e82]
      - generic [ref=e84]:
        - generic [ref=e88]: Tất cả các nút lâm sàng đã đồng bộ hóa
        - generic [ref=e90]:
          - img [ref=e91]
          - generic [ref=e94]: FRI, MAY 22, 2026, 21:57:22 GMT+7
    - generic [ref=e95]:
      - complementary [ref=e96]:
        - generic [ref=e97]:
          - generic [ref=e98]:
            - img [ref=e102]
            - generic [ref=e105]:
              - heading "VN-BECS" [level=2] [ref=e106]
              - paragraph [ref=e107]: Enterprise Command V1.0
          - navigation [ref=e108]:
            - button "System Portal" [ref=e109]:
              - img [ref=e110]
              - generic [ref=e113]: System Portal
            - generic [ref=e114]:
              - generic [ref=e115]:
                - img [ref=e117]
                - generic [ref=e121]: Clinical Flow
              - generic [ref=e122]:
                - button "Kiểm soát Nhiệm vụ" [ref=e123]:
                  - generic [ref=e124]:
                    - img [ref=e126]
                    - generic [ref=e128]: Kiểm soát Nhiệm vụ
                - button "Xác minh tại Giường bệnh" [ref=e129]:
                  - generic [ref=e130]:
                    - img [ref=e132]
                    - generic [ref=e135]: Xác minh tại Giường bệnh
                - button "Yêu cầu Khẩn cấp" [ref=e136]:
                  - generic [ref=e137]:
                    - img [ref=e139]
                    - generic [ref=e143]: Yêu cầu Khẩn cấp
                - button "Truyền máu Khối lượng lớn (MTP)" [ref=e144]:
                  - generic [ref=e145]:
                    - img [ref=e147]
                    - generic [ref=e149]: Truyền máu Khối lượng lớn (MTP)
        - generic [ref=e152]:
          - generic [ref=e153]: AD
          - generic [ref=e154]:
            - paragraph [ref=e155]: Administrator
            - paragraph [ref=e158]: Live Secure
      - main [ref=e159]:
        - generic [ref=e161]:
          - generic [ref=e162]:
            - img [ref=e164]
            - generic [ref=e167]:
              - img [ref=e169]
              - generic [ref=e171]:
                - heading "Khẩn cấp MTP (SOP 12)" [level=1] [ref=e172]
                - paragraph [ref=e173]: Circular 26/2013/TT-BYT Compliant · Rapid Release
            - generic [ref=e174]:
              - button "Break-Glass (O-Neg)" [ref=e175]:
                - img [ref=e176]
                - text: Break-Glass (O-Neg)
              - button "Kích hoạt MTP Mới" [ref=e178]:
                - img [ref=e179]
                - text: Kích hoạt MTP Mới
          - generic [ref=e181]:
            - generic [ref=e182]:
              - generic [ref=e183]:
                - heading "Giám sát Hồi sức Trực tiếp" [level=2] [ref=e184]:
                  - img [ref=e185]
                  - text: Giám sát Hồi sức Trực tiếp
                - generic [ref=e187]: 0 Giám sát
              - generic [ref=e188]:
                - img [ref=e189]
                - paragraph [ref=e191]: Không có Quy trình MTP nào đang hoạt động
            - generic [ref=e192]:
              - generic [ref=e193]:
                - img [ref=e194]
                - heading "Circular 26/2013/TT-BYT Guidelines" [level=2] [ref=e198]
              - generic [ref=e199]:
                - generic [ref=e200]:
                  - generic [ref=e201]:
                    - generic [ref=e202]: "1"
                    - generic [ref=e203]:
                      - heading "Immediate Release (O-)" [level=4] [ref=e204]
                      - paragraph [ref=e205]: Issue uncrossmatched O- PRBCs immediately upon physician approval (SOP 10).
                  - generic [ref=e206]:
                    - generic [ref=e207]: "2"
                    - generic [ref=e208]:
                      - heading "Retrospective Sample" [level=4] [ref=e209]
                      - paragraph [ref=e210]: Collect patient sample for crossmatch as soon as possible.
                  - generic [ref=e211]:
                    - generic [ref=e212]: "3"
                    - generic [ref=e213]:
                      - heading "Ratio Transfusion (1:1:1)" [level=4] [ref=e214]
                      - paragraph [ref=e215]: Maintain balanced ratio of PRBC:FFP:PLT to prevent coagulopathy.
                  - generic [ref=e216]:
                    - generic [ref=e217]: "4"
                    - generic [ref=e218]:
                      - heading "Mandatory Documentation" [level=4] [ref=e219]
                      - paragraph [ref=e220]: Update all records post-emergency. Retrospective testing mandatory within 24h.
                - generic [ref=e221]:
                  - img [ref=e222]
                  - generic [ref=e224]:
                    - heading "Compliance Alert" [level=4] [ref=e225]
                    - paragraph [ref=e226]: Emergency uncrossmatched blood release requires documented authorization by the attending physician per Article 17, Circular 26.
          - generic [ref=e228]:
            - generic [ref=e229]:
              - generic [ref=e230]:
                - heading "Initiate MTP" [level=3] [ref=e231]
                - paragraph [ref=e232]: Standard Protocol
              - img [ref=e234]
            - generic [ref=e236]:
              - generic [ref=e237]:
                - text: Patient Profile (MRN)
                - generic [ref=e238] [cursor=pointer]:
                  - generic [ref=e239]:
                    - generic [ref=e240]: MRN-HCM-887766
                    - generic [ref=e241]: Nguyễn Văn A
                  - img [ref=e242]
              - generic [ref=e244]:
                - text: Location
                - textbox [ref=e245]: ER - Trauma Bay 1
              - generic [ref=e246]:
                - text: Authorized Clinician
                - textbox [ref=e247]: Dr. Nguyen (ER Lead)
            - generic [ref=e248]:
              - button "Cancel" [ref=e249]
              - button "Initiate Protocol" [active] [ref=e250]
```