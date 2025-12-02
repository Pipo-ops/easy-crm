import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LkwComponent } from './lkw.component';

describe('LkwComponent', () => {
  let component: LkwComponent;
  let fixture: ComponentFixture<LkwComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LkwComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(LkwComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
