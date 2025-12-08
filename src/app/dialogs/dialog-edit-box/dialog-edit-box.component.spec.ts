import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogEditBoxComponent } from './dialog-edit-box.component';

describe('DialogEditBoxComponent', () => {
  let component: DialogEditBoxComponent;
  let fixture: ComponentFixture<DialogEditBoxComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DialogEditBoxComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DialogEditBoxComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
