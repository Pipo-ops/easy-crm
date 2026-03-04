import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogEditTourComponent } from './dialog-edit-tour.component';

describe('DialogEditTourComponent', () => {
  let component: DialogEditTourComponent;
  let fixture: ComponentFixture<DialogEditTourComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DialogEditTourComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DialogEditTourComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
